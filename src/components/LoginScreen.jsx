import { useState } from 'react';
import { createGreenApi } from '../api/greenApi';
import { describeState, isInstanceReady } from '../api/notifications';
import { IconAlert, IconWhatsApp } from './icons';

const STATES_HINT = {
  notAuthorized: 'Отсканируйте QR-код инстанса в личном кабинете: https://console.green-api.com',
  starting: 'Инстанс запускается. Подождите около минуты и повторите вход.',
  sleepMode: 'Инстанс в спящем режиме. Перезапустите его в личном кабинете.',
  blocked: 'Инстанс заблокирован WhatsApp. Обратитесь в поддержку GREEN-API.',
  suspended: 'Инстанс заблокирован WhatsApp. Обратитесь в поддержку GREEN-API.',
};

export default function LoginScreen({ onConnect, baseUrl }) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const idValid = /^\d{1,20}$/.test(idInstance.trim());
  const tokenValid = apiTokenInstance.trim().length > 10;
  const canSubmit = idValid && tokenValid && !pending;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError('');

    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    };

    try {
      const api = createGreenApi({ ...credentials, baseUrl });
      const state = await api.getStateInstance();

      if (!isInstanceReady(state)) {
        setError(
          `Инстанс не авторизован (состояние: ${describeState(state)}). ${
            STATES_HINT[state] || 'Проверьте авторизацию в личном кабинете GREEN-API.'
          }`,
        );
        setPending(false);
        return;
      }

      onConnect({ api, credentials });
    } catch (err) {
      setError(err.message || 'Не удалось подключиться к GREEN-API.');
      setPending(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden="true">
          <IconWhatsApp width="52" height="52" />
        </div>

        <h1 className="login__title">WhatsApp</h1>
        <p className="login__subtitle">Войдите с учётными данными GREEN-API</p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="idInstance"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            disabled={pending}
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="text"
            autoComplete="off"
            placeholder="apiTokenInstance"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            disabled={pending}
          />
        </label>

        {error && (
          <div className="login__error" role="alert">
            <IconAlert width="18" height="18" />
            <span>{error}</span>
          </div>
        )}

        <button className="login__submit" type="submit" disabled={!canSubmit}>
          {pending ? 'Подключение…' : 'Войти'}
        </button>

        <p className="login__hint">
          Данные берутся в личном кабинете{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            console.green-api.com
          </a>
          . Перед входом отсканируйте QR-код инстанса и убедитесь, что параметр{' '}
          <code>webhookUrl</code> пуст — иначе методы приёма уведомлений не работают.
        </p>
      </form>
    </div>
  );
}
