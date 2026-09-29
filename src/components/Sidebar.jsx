import { useMemo, useState } from 'react';
import { selectLastMessage, selectOrderedChats } from '../state/chatReducer';
import { avatarColor, chatTitle, formatListTime, initials } from '../utils/chat';
import { IconLogout, IconNewChat, IconPerson, IconSearch } from './icons';

function Avatar({ chat, size = 49 }) {
  const title = chatTitle(chat.chatId, chat.title);

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, backgroundColor: avatarColor(chat.chatId), fontSize: size * 0.38 }}
    >
      {initials(title)}
    </div>
  );
}

function ChatItem({ chat, lastMessage, active, onSelect }) {
  const title = chatTitle(chat.chatId, chat.title);
  const preview = lastMessage
    ? `${lastMessage.direction === 'out' ? 'Вы: ' : ''}${lastMessage.failed ? '⚠ не отправлено · ' : ''}${lastMessage.text}`
    : 'Нет сообщений';
  const time = chat.lastTimestamp || (lastMessage ? lastMessage.timestamp : 0);

  return (
    <button
      type="button"
      className={`chat-item${active ? ' chat-item--active' : ''}`}
      onClick={() => onSelect(chat.chatId)}
    >
      <Avatar chat={chat} />

      <div className="chat-item__body">
        <div className="chat-item__top">
          <span className="chat-item__title">{title}</span>
          <span className="chat-item__time">{formatListTime(time)}</span>
        </div>

        <div className="chat-item__bottom">
          <span className="chat-item__preview">
            {lastMessage && lastMessage.direction === 'out' && <span className="chat-item__check">✓✓</span>}
            <span className="chat-item__text">{preview}</span>
          </span>
          {chat.unread > 0 && <span className="chat-item__badge">{chat.unread}</span>}
        </div>
      </div>
    </button>
  );
}

export default function Sidebar({
  state,
  activeChatId,
  onSelect,
  onNewChat,
  onLogout,
  credentials,
  instanceState,
  pollingError,
}) {
  const [query, setQuery] = useState('');

  const chats = useMemo(() => selectOrderedChats(state), [state]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;

    return chats.filter((chat) => {
      const digits = needle.replace(/\D/g, '');
      const title = chatTitle(chat.chatId, chat.title).toLowerCase();

      if (title.includes(needle)) return true;
      return digits.length > 0 && chat.chatId.replace(/\D/g, '').includes(digits);
    });
  }, [chats, query]);

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__me" title={`idInstance ${credentials.idInstance}`}>
          <IconPerson width="20" height="20" />
        </div>

        <div className="sidebar__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onLogout}
            title="Выйти из аккаунта GREEN-API"
          >
            <IconLogout width="24" height="24" />
          </button>
        </div>
      </header>

      <div className="sidebar__search">
        <IconSearch className="sidebar__search-icon" width="18" height="18" />
        <input
          className="sidebar__search-input"
          type="search"
          placeholder="Поиск или начало нового чата"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="sidebar__new" onClick={onNewChat} title="Новый чат">
          <IconNewChat width="22" height="22" />
        </button>
      </div>

      <div className={`connection${pollingError ? ' connection--error' : ''}`}>
        <span className="connection__dot" />
        <span title={pollingError || undefined}>
          {pollingError
            ? pollingError
            : `Инстанс ${credentials.idInstance} · ${instanceState}`}
        </span>
      </div>

      <div className="chat-list">
        {visible.length === 0 ? (
          <p className="chat-list__empty">
            {chats.length === 0
              ? 'Нет чатов'
              : 'Ничего не найдено'}
          </p>
        ) : (
          visible.map((chat) => (
            <ChatItem
              key={chat.chatId}
              chat={chat}
              active={chat.chatId === activeChatId}
              lastMessage={selectLastMessage(state, chat.chatId)}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </aside>
  );
}
