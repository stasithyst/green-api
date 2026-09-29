import { useEffect, useRef } from 'react';

const POLL_TIMEOUT_SECONDS = 15;
const RETRY_DELAY_MS = 3000;
const RATE_LIMIT_DELAY_MS = 10000;
const MAX_RETRY_DELAY_MS = 60000;
const DELETE_RETRY_DELAY_MS = 2000;
const RATE_LIMIT_SUCCESSES = 3;

export function useNotificationPolling({ api, enabled, onNotification, onError }) {
  const handleNotification = useRef(onNotification);
  const handleError = useRef(onError);
  const runChain = useRef(Promise.resolve());

  handleNotification.current = onNotification;
  handleError.current = onError;

  useEffect(() => {
    if (!api || !enabled) return undefined;

    let stopped = false;
    let retryDelay = RETRY_DELAY_MS;
    let rateLimitDelay = RATE_LIMIT_DELAY_MS;
    let rateLimitSuccesses = 0;
    const errors = { poll: null, confirm: null, handler: null };

    const sleep = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    const publishError = () => {
      handleError.current(errors.poll || errors.confirm || errors.handler || null);
    };

    async function confirm(receiptId) {
      let delay = DELETE_RETRY_DELAY_MS;

      while (!stopped) {
        try {
          await api.deleteNotification(receiptId);
          errors.confirm = null;
          publishError();
          return true;
        } catch (error) {
          errors.confirm = error;
          publishError();
          await sleep(delay);
          delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
        }
      }

      return false;
    }

    async function loop() {
      while (!stopped) {
        const startedAt = Date.now();
        let notification = null;

        try {
          notification = await api.receiveNotification({ receiveTimeout: POLL_TIMEOUT_SECONDS });
        } catch (error) {
          if (stopped) return;

          errors.poll = error;
          publishError();

          if (error.status === 429) {
            rateLimitSuccesses = 0;
            await sleep(rateLimitDelay);
            rateLimitDelay = Math.min(rateLimitDelay * 2, MAX_RETRY_DELAY_MS);
          } else {
            const wait = retryDelay;
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
            await sleep(wait);
          }

          continue;
        }

        if (stopped) return;

        errors.poll = null;
        publishError();
        retryDelay = RETRY_DELAY_MS;
        if (++rateLimitSuccesses >= RATE_LIMIT_SUCCESSES) rateLimitDelay = RATE_LIMIT_DELAY_MS;

        if (notification) {
          errors.handler = null;
          try {
            if (notification.body) {
              handleNotification.current(notification.body, notification.receiptId);
            }
          } catch (error) {
            errors.handler = error;
          }
          publishError();

          const confirmed = await confirm(notification.receiptId);
          if (!confirmed) return;
          continue;
        }

        const remaining = POLL_TIMEOUT_SECONDS * 1000 - (Date.now() - startedAt);
        if (remaining > 0) await sleep(remaining);
      }
    }

    const run = runChain.current.then(() => (stopped ? undefined : loop()));
    runChain.current = run.then(() => {}, () => {});

    return () => {
      stopped = true;
    };
  }, [api, enabled]);
}
