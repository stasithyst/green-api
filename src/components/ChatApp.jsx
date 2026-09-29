import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  describeState,
  isIncomingTextMessage,
  isOwnTextMessage,
  normalizeNotification,
  WEBHOOK_OUTGOING_STATUS,
  WEBHOOK_STATE_CHANGED,
} from '../api/notifications';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { chatReducer, initialChatState, selectMessagesForChat } from '../state/chatReducer';
import Composer from './Composer';
import MessageList, { ChatHeader } from './MessageList';
import NewChatDialog from './NewChatDialog';
import Sidebar from './Sidebar';
import { IconAlert, IconWhatsApp } from './icons';

const localKey = () => `out:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

export default function ChatApp({ api, credentials, onLogout }) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [activeChatId, setActiveChatId] = useState(null);
  const [instanceState, setInstanceState] = useState(describeState('authorized'));
  const [pollingError, setPollingError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  const noticeTimerRef = useRef(null);

  const showNotice = useCallback((text) => {
    setNotice(text);
    if (!text) return;

    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice('');
    }, 6000);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const handleNotification = useCallback(
    (body) => {
      const notification = normalizeNotification(body);
      if (!notification) return;

      if (notification.typeWebhook === WEBHOOK_STATE_CHANGED) {
        setInstanceState(describeState(notification.stateInstance));
        return;
      }

      if (notification.typeWebhook === WEBHOOK_OUTGOING_STATUS) {
        dispatch({
          type: 'message/status',
          idMessage: notification.idMessage,
          status: notification.status,
        });
        return;
      }

      const fromMe = isOwnTextMessage(notification);
      if (!fromMe && !isIncomingTextMessage(notification)) return;

      dispatch({
        type: 'message/receive',
        chatId: notification.chatId,
        title: notification.title,
        idMessage: notification.idMessage,
        text: notification.text,
        timestamp: notification.timestamp,
        fromMe,
        isActive: notification.chatId === activeChatIdRef.current,
      });
    },
    [],
  );

  const handlePollingError = useCallback((error) => {
    setPollingError(error ? error.message || 'Ошибка получения уведомлений.' : '');
  }, []);

  // Реальное состояние инстанса (на случай сна/разлогина) и пробуждение при необходимости
  const refreshInstanceState = useCallback(async () => {
    try {
      let current = await api.getStateInstance();
      if (!current) return;

      if (current === 'sleepMode') {
        current = (await api.activateInstance()) || current;
      }

      setInstanceState(describeState(current));
    }
    catch {}
  }, [api]);

  useEffect(() => {
    refreshInstanceState();
    const timer = setInterval(refreshInstanceState, 30000);
    return () => clearInterval(timer);
  }, [refreshInstanceState]);

  useNotificationPolling({ api, enabled: true, onNotification: handleNotification, onError: handlePollingError });

  useEffect(() => {
    if (activeChatId)
      dispatch({
      type: 'chat/read', chatId: activeChatId
    });
  }, [activeChatId]);

  const handleSelect = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  const handleCreateChat = useCallback((chatId) => {
    dispatch({ type: 'chat/open', chatId });
    setActiveChatId(chatId);
    setDialogOpen(false);
  }, []);

  const handleSend = useCallback(
    async (text) => {
      if (!activeChatId) return;

      const key = localKey();
      const timestamp = Math.floor(Date.now() / 1000);

      dispatch({
        type: 'message/pending', key, chatId: activeChatId, text, timestamp
      });

      try {
        const result = await api.sendMessage(activeChatId, text);
        dispatch({
          type: 'message/sent', key, chatId: activeChatId, idMessage: result.idMessage, timestamp
        });
      } catch (error) {
        dispatch({
          type: 'message/failed', key
        });
        showNotice(error.message || 'Сообщение не отправлено.');
      }
    },
    [api, activeChatId, showNotice],
  );

  const messages = useMemo(
    () => selectMessagesForChat(state, activeChatId),
    [state, activeChatId],
  );

  const activeChat = activeChatId ? state.chats[activeChatId] : null;

  return (
    <div className={`app${activeChatId ? ' app--chat-open' : ''}`}>
      <div className="app__frame">
        <Sidebar
          state={state}
          activeChatId={activeChatId}
          onSelect={handleSelect}
          onNewChat={() => setDialogOpen(true)}
          onLogout={onLogout}
          credentials={credentials}
          instanceState={instanceState}
          pollingError={pollingError}
        />

        <main className="chat">
          {activeChatId ? (
            <>
              <ChatHeader
                chatId={activeChatId}
                title={activeChat ? activeChat.title : ''}
                onBack={() => setActiveChatId(null)}
              />
              <MessageList messages={messages} />
              <Composer onSend={handleSend} />
            </>
          ) : (
            <div className="chat__empty">
              <div className="chat__empty-mark" aria-hidden="true">
                <IconWhatsApp width="120" height="120" />
              </div>
              <h2 className="chat__empty-title">WhatsApp для GREEN-API</h2>
              <p className="chat__empty-text">
                Выберите чат слева или укажите номер телефона, чтобы начать общение
              </p>
            </div>
          )}
        </main>
      </div>

      {notice && (
        <div className="toast" role="alert">
          <IconAlert width="18" height="18" />
          <span>{notice}</span>
        </div>
      )}

      {pollingError && (
        <div className="banner" role="status">
          <IconAlert width="18" height="18" />
          <span>{pollingError}</span>
        </div>
      )}

      {dialogOpen && <NewChatDialog onClose={() => setDialogOpen(false)} onCreate={handleCreateChat} />}
    </div>
  );
}
