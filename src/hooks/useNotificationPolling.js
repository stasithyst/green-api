import { useEffect, useRef } from 'react';

const POLL_TIMEOUT_SECONDS = 15;
const RETRY_DELAY_MS = 3000;
const RATE_LIMIT_DELAY_MS = 10000;
const MAX_RETRY_DELAY_MS = 60000;
const DELETE_RETRY_DELAY_MS = 2000;
/** После нескольких подряд 429 пауза возвращается к базовой. */
const RATE_LIMIT_SUCCESSES = 3;

export function useNotificationPolling({ api, enabled, onNotification, onError }) {
  const handleNotification = useRef(onNotification);
  const handleError = useRef(onError);
  // Один активный цикл опроса: StrictMode/HMR поднимал второй параллельный,
  // сервер отвечал пустым 200 мгновенно и опрос превращался в шквал запросов.
  const runChain = useRef(Promise.resolve());

  handleNotification.current = onNotification;
  handleError.current = onError;

  useEffect(() => {
    if (!api || !enabled) return undefined;

    let stopped = false;
    let retryDelay = RETRY_DELAY_MS;
    let rateLimitDelay = RATE_LIMIT_DELAY_MS;
    let rateLimitSuccesses = 0;
    // Три независимых источника: успешный опрос не должен стирать ошибку
    // подтверждения, иначе заблокированная очередь выглядит как «всё зелёное».
    const errors = { poll: null, confirm: null, handler: null };

    const sleep = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    const publishError = () => {
      handleError.current(errors.poll || errors.confirm || errors.handler || null);
    };

    // Пока уведомление не подтверждено, GREEN-API отдаёт то же самое receiptId,
    // и новые входящие стоят за ним в очереди. Поэтому подтверждаем до успеха.
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

          // Показываем ошибку и продолжаем опрос: один сбой не должен навсегда
          // остановить приём входящих сообщений.
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

        // Долгий опрос прошёл успешно — соединение живое, снимаем ошибку опроса
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

          // Подтверждаем даже при ошибке обработки, иначе уведомление
          // навсегда заблокирует очередь
          const confirmed = await confirm(notification.receiptId);
          if (!confirmed) return;
          continue;
        }

        // Пустой ответ. По документации сервер обязан держать соединение
        // receiveTimeout секунд, но на практике отвечает сразу — без дозамера
        // опрос уходит в шквал и упирается в 429. Досыпаем остаток интервала.
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
