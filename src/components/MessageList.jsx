import { useEffect, useMemo, useRef } from 'react';
import { avatarColor, chatTitle, formatDivider, formatTime, initials, prettyPhone } from '../utils/chat';
import { IconBack, IconCheckDouble, IconCheckSingle, IconClock, IconLock } from './icons';

function StatusIcon({ message }) {
  if (message.failed) return <IconClock className="bubble__status bubble__status--failed" width="16" height="16" />;
  if (message.pending) return <IconClock className="bubble__status" width="16" height="16" />;
  if (message.direction !== 'out') return null;

  if (message.status === 'read') {
    return <IconCheckDouble className="bubble__status bubble__status--read" width="16" height="16" />;
  }

  if (message.status === 'sent' || message.status === 'delivered') {
    return <IconCheckSingle className="bubble__status bubble__status--read" width="16" height="16" />;
  }

  return <IconCheckSingle className="bubble__status" width="16" height="16" />;
}

function Bubble({ message, showTail }) {
  return (
    <div className={`bubble-row bubble-row--${message.direction}`}>
      <div className={`bubble bubble--${message.direction}${showTail ? ' bubble--tail' : ''}`}>
        <span className="bubble__text">{message.text}</span>
        <span className="bubble__meta">
          {message.failed && <em className="bubble__error">не отправлено</em>}
          {formatTime(message.timestamp)}
          <StatusIcon message={message} />
        </span>
      </div>
    </div>
  );
}

export default function MessageList({ messages }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const rows = useMemo(() => {
    let previous = null;
    return messages.map((message) => {
      const divider = formatDivider(message.timestamp);
      const showDivider = divider !== previous;
      previous = divider;
      return { message, divider, showDivider };
    });
  }, [messages]);

  return (
    <div className="messages" ref={scrollRef}>
      <div className="messages__inner">
        <div className="messages__start">
          <span className="messages__start-lock" aria-hidden="true">
            <IconLock width="20" height="20" />
          </span>
          <p>Сообщения защищены сквозным шифрованием</p>
        </div>

        {rows.map(({ message, divider, showDivider }, index) => (
          <div key={message.key}>
            {showDivider && <div className="divider">{divider}</div>}
            <Bubble message={message} showTail={index === rows.length - 1 || rows[index + 1].message.direction !== message.direction} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatHeader({ chatId, title, onBack }) {
  const name = chatTitle(chatId, title);

  return (
    <header className="chat-header">
      <button type="button" className="chat-header__back" onClick={onBack} title="Назад к чатам">
        <IconBack width="24" height="24" />
      </button>

      <div className="avatar" style={{ width: 40, height: 40, backgroundColor: avatarColor(chatId), fontSize: 15 }}>
        {initials(name)}
      </div>

      <div className="chat-header__info">
        <div className="chat-header__name">{name}</div>
        <div className="chat-header__phone">{prettyPhone(chatId)}</div>
      </div>
    </header>
  );
}
