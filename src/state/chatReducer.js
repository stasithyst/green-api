export const initialChatState = {
  chats: {},
  order: [],
  messages: [],
};

const MAX_MESSAGES = 500;

function upsertChat(state, chatId, title) {
  const existing = state.chats[chatId];

  if (!existing) {
    return {
      chats: { ...state.chats, [chatId]: { chatId, title: title || '', unread: 0, lastTimestamp: 0 } },
      order: [chatId, ...state.order],
    };
  }

  if (!title || title === existing.title) return null;

  return {
    chats: { ...state.chats, [chatId]: { ...existing, title } },
    order: state.order,
  };
}

function patchMessage(state, matcher, patch) {
  let changed = false;

  const messages = state.messages.map((message) => {
    if (!matcher(message)) return message;
    changed = true;
    return { ...message, ...patch };
  });

  return changed ? { messages } : null;
}

export function chatReducer(state, action) {
  switch (action.type) {
    case 'chat/open': {
      const patch = upsertChat(state, action.chatId);
      if (!patch) return state;

      const now = Math.floor(Date.now() / 1000);
      const chat = patch.chats[action.chatId];

      return {
        ...state,
        ...patch,
        chats: {
          ...patch.chats,
          [action.chatId]: { ...chat, lastTimestamp: Math.max(chat.lastTimestamp, now) },
        },
      };
    }

    case 'message/receive': {
      const { chatId, title, idMessage, text, timestamp, fromMe } = action;
      const key = `${fromMe ? 'out' : 'in'}:${idMessage}`;

      if (state.messages.some((message) => message.key === key)) return state;
      if (idMessage && state.messages.some((message) => message.idMessage === idMessage)) return state;

      const chatPatch = upsertChat(state, chatId, title);
      const current = chatPatch ? { ...state, ...chatPatch } : state;
      const chat = current.chats[chatId];

      const message = {
        key,
        chatId,
        idMessage,
        direction: fromMe ? 'out' : 'in',
        text,
        timestamp,
        status: null,
        pending: false,
        failed: false,
      };

      const chats = {
        ...current.chats,
        [chatId]: {
          ...chat,
          lastTimestamp: Math.max(chat.lastTimestamp, timestamp || 0),
          unread: action.isActive || fromMe ? chat.unread : chat.unread + 1,
        },
      };

      const order = current.order.includes(chatId)
        ? [chatId, ...current.order.filter((id) => id !== chatId)]
        : current.order;

      const messages = [...current.messages, message].slice(-MAX_MESSAGES);

      return { chats, order, messages };
    }

    case 'message/pending': {
      const patch = upsertChat(state, action.chatId);
      const current = patch ? { ...state, ...patch } : state;
      const chat = current.chats[action.chatId];

      return {
        ...current,
        chats: {
          ...current.chats,
          [action.chatId]: {
            ...chat,
            lastTimestamp: Math.max(chat.lastTimestamp, action.timestamp || 0),
          },
        },
        order: [action.chatId, ...current.order.filter((id) => id !== action.chatId)],
        messages: [
          ...current.messages,
          {
            key: action.key,
            chatId: action.chatId,
            idMessage: null,
            direction: 'out',
            text: action.text,
            timestamp: action.timestamp,
            status: null,
            pending: true,
            failed: false,
          },
        ],
      };
    }

    case 'message/sent': {
      const fromWebhook = Boolean(action.idMessage) && state.messages.some(
        (message) => message.idMessage === action.idMessage && message.key !== action.key,
      );
      if (fromWebhook) {
        return { ...state, messages: state.messages.filter((message) => message.key !== action.key) };
      }

      const patch = patchMessage(state, (m) => m.key === action.key, {
        idMessage: action.idMessage,
        pending: false,
        status: null,
      });
      if (!patch) return state;

      const timestamp = action.timestamp;
      const message = state.messages.find((m) => m.key === action.key);
      const chat = state.chats[action.chatId];

      return {
        ...state,
        ...patch,
        chats: message && chat
          ? { ...state.chats, [action.chatId]: { ...chat, lastTimestamp: Math.max(chat.lastTimestamp, timestamp) } }
          : state.chats,
      };
    }

    case 'message/failed': {
      const patch = patchMessage(state, (m) => m.key === action.key, { pending: false, failed: true });
      return patch ? { ...state, ...patch } : state;
    }

    case 'message/status': {
      const patch = patchMessage(
        state,
        (m) => m.idMessage && m.idMessage === action.idMessage,
        { status: action.status, failed: action.status === 'failed' },
      );
      return patch ? { ...state, ...patch } : state;
    }

    case 'chat/read': {
      const chat = state.chats[action.chatId];
      if (!chat || chat.unread === 0) return state;
      return { ...state, chats: { ...state.chats, [action.chatId]: { ...chat, unread: 0 } } };
    }

    default:
      return state;
  }
}

export function selectOrderedChats(state) {
  return state.order
    .map((chatId) => state.chats[chatId])
    .filter(Boolean)
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export function selectMessagesForChat(state, chatId) {
  if (!chatId) return [];
  return state.messages.filter((message) => message.chatId === chatId);
}

export function selectLastMessage(state, chatId) {
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    if (state.messages[i].chatId === chatId) return state.messages[i];
  }
  return null;
}
