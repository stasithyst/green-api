import { useEffect, useRef, useState } from 'react';
import { IconSend } from './icons';

const MAX_LENGTH = 20000;

export default function Composer({ onSend }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    submit();
  }

  function submit() {
    const value = text.trim();
    if (!value) return;

    onSend(value);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  const canSend = text.trim().length > 0;

  return (
    <footer className="composer">
      <div className="composer__field">
        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          placeholder="Напишите сообщение"
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            setText(event.target.value);
            event.target.style.height = 'auto';
            event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="composer__send"
          onClick={submit}
          disabled={!canSend}
          title="Отправить"
        >
          <IconSend width="20" height="20" />
        </button>
      </div>
    </footer>
  );
}
