const DEFAULT_BASE_URL = 'https://api.green-api.com';
const DEFAULT_TIMEOUT_MS = 30000;
const SEND_TIMEOUT_MS = 60000;
const DELETE_TIMEOUT_MS = 20000;
const RECEIVE_TIMEOUT_GRACE_MS = 20000;

class GreenApiError extends Error {
  constructor(message, { status = 0, code = null, payload = null } = {}) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function describeError(status, payload) {
  const serverMessage =
    (payload && typeof payload.message === 'string' && payload.message.trim()) || '';

  if (serverMessage) return serverMessage;

  switch (status) {
    case 400:
      return 'Некорректный запрос к GREEN-API. Проверьте параметры инстанса и настройки уведомлений.';
    case 401:
      return 'Неверный apiTokenInstance. Проверьте токен в личном кабинете GREEN-API.';
    case 403:
      return 'Доступ запрещён. Проверьте idInstance и адрес запроса.';
    case 404:
      return 'Метод не найден. Проверьте версию API и базовый адрес.';
    case 429:
      return 'Превышен лимит запросов. Немного подождите и повторите.';
    case 466:
      return 'Исчерпан лимит тарифа (466). Пополните баланс в личном кабинете GREEN-API.';
    case 499:
      return 'Соединение закрыто до получения ответа. Повторите запрос.';
    case 502:
      return 'Шлюз GREEN-API недоступен. Повторите запрос позже.';
    default:
      return `Ошибка GREEN-API: HTTP ${status || 'нет ответа'}.`;
  }
}

export function createGreenApi({ idInstance, apiTokenInstance, baseUrl = DEFAULT_BASE_URL }) {
  const base = String(baseUrl).replace(/\/+$/, '');
  const methodUrl = (method) => `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}`;

  async function request(method, path, body, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    let response;
    try {
      response = await fetch(path, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
      });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new GreenApiError('GREEN-API не ответил за отведённое время. Проверьте сеть и повторите.', {
          code: 'timeout',
        });
      }
      throw new GreenApiError('Не удалось связаться с GREEN-API. Проверьте подключение к интернету и адрес API.');
    } finally {
      if (timer) clearTimeout(timer);
    }

    let raw;
    try {
      raw = await response.text();
    } catch {
      throw new GreenApiError('Не удалось прочитать ответ GREEN-API. Повторите запрос.', {
        status: response.status,
      });
    }

    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new GreenApiError(describeError(response.status, payload), {
        status: response.status,
        code: payload && payload.code ? payload.code : null,
        payload,
      });
    }

    return payload;
  }

  async function getStateInstance() {
    const data = await request('GET', methodUrl('getStateInstance'));
    return (data && data.stateInstance) || null;
  }

  /** Пробуждение инстанса из спящего режима — без него входящие не приходят. */
  async function activateInstance() {
    const data = await request('POST', methodUrl('activateInstance'));
    return (data && data.stateInstance) || null;
  }

  async function sendMessage(chatId, message) {
    const data = await request('POST', methodUrl('sendMessage'), { chatId, message }, { timeoutMs: SEND_TIMEOUT_MS });

    if (!data || !data.idMessage) {
      throw new GreenApiError('GREEN-API принял запрос, но не вернул идентификатор сообщения.');
    }

    return { idMessage: data.idMessage, chatId: data.chatId || chatId };
  }

  async function receiveNotification({ receiveTimeout = 10 } = {}) {
    const data = await request(
      'GET',
      `${methodUrl('receiveNotification')}?receiveTimeout=${receiveTimeout}`,
      undefined,
      { timeoutMs: (Number(receiveTimeout) || 0) * 1000 + RECEIVE_TIMEOUT_GRACE_MS },
    );

    if (!data || data.receiptId === undefined || data.receiptId === null) {
      return null;
    }

    return { receiptId: data.receiptId, body: data.body || null };
  }

  async function deleteNotification(receiptId) {
    const data = await request(
      'DELETE',
      `${methodUrl('deleteNotification')}/${receiptId}`,
      undefined,
      { timeoutMs: DELETE_TIMEOUT_MS },
    );

    if (data && data.result === false) {
      throw new GreenApiError('GREEN-API не подтвердил удаление уведомления из очереди.', {
        status: 200,
        payload: data,
      });
    }

    return true;
  }

  return { getStateInstance, activateInstance, sendMessage, receiveNotification, deleteNotification };
}
