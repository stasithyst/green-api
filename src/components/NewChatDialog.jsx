import { useEffect, useRef, useState } from 'react';
import { isValidChatId, normalizePhoneInput, toChatId } from '../utils/chat';

export default function NewChatDialog({ onClose, onCreate }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const chatId = toChatId(value);
  const valid = isValidChatId(chatId);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    onCreate(chatId);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <h2 className="modal__title">Новый чат</h2>
          <button type="button" className="modal__close" onClick={onClose} title="Закрыть">
            ×
          </button>
        </header>

        <form className="modal__body" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Номер телефона получателя</span>
            <input
              ref={inputRef}
              className="field__input"
              type="tel"
              autoComplete="off"
              placeholder="+7 987 654 32 10"
              value={value}
              onChange={(event) => setValue(normalizePhoneInput(event.target.value))}
            />
          </label>

          <p className="modal__hint">
            Номер указывается с кодом страны. Номер, начинающийся с 8, автоматически заменяется на +7.
          </p>

          {value.trim() && !valid && <p className="modal__hint modal__hint--error">Ожидается 7–15 цифр номера.</p>}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary" disabled={!valid}>
              Создать чат
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
