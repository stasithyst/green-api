const WEBHOOK_INCOMING_MESSAGE = 'incomingMessageReceived';
const WEBHOOK_OUTGOING_MESSAGE = 'outgoingMessageReceived';
export const WEBHOOK_OUTGOING_STATUS = 'outgoingMessageStatus';
export const WEBHOOK_STATE_CHANGED = 'stateInstanceChanged';

const TEXT_MESSAGE_TYPES = new Set(['textMessage', 'extendedTextMessage']);

export function normalizeNotification(body) {
  if (!body || typeof body !== 'object') return null;

  const senderData = body.senderData || {};
  const messageData = body.messageData || {};

  return {
    typeWebhook: body.typeWebhook || null,
    idMessage: body.idMessage || null,
    chatId: senderData.chatId || body.chatId || null,
    title: senderData.chatName || senderData.senderName || body.senderName || '',
    timestamp: Number(body.timestamp || body.date || 0),
    typeMessage: messageData.typeMessage || body.typeMessage || null,
    text:
      (messageData.textMessageData && messageData.textMessageData.textMessage) ||
      (messageData.extendedTextMessageData && messageData.extendedTextMessageData.textMessage) ||
      body.textMessage ||
      body.text ||
      '',
    stateInstance: body.stateInstance || null,
    status: body.status || null,
  };
}

function isTextMessage(notification) {
  if (notification.typeMessage && !TEXT_MESSAGE_TYPES.has(notification.typeMessage)) return false;
  return Boolean(notification.chatId) && notification.text !== '';
}

export function isIncomingTextMessage(notification) {
  if (notification.typeWebhook !== WEBHOOK_INCOMING_MESSAGE) return false;
  return isTextMessage(notification);
}

export function isOwnTextMessage(notification) {
  if (notification.typeWebhook !== WEBHOOK_OUTGOING_MESSAGE) return false;
  return isTextMessage(notification);
}

const STATE_LABELS = {
  authorized: 'Авторизован',
  notAuthorized: 'Не авторизован',
  starting: 'Запускается',
  sleepMode: 'Спящий режим',
  blocked: 'Заблокирован',
  suspended: 'Заблокирован',
  yellowCard: 'Ограничен',
};

export function describeState(state) {
  if (!state) return 'Неизвестно';
  return STATE_LABELS[state] || state;
}

export function isInstanceReady(state) {
  return state === 'authorized';
}
