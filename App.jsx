import { useCallback, useState } from 'react';
import { createGreenApi } from './src/api/greenApi.js';
import ChatApp from './src/components/ChatApp.jsx';
import LoginScreen from './src/components/LoginScreen.jsx';
import { clearCredentials, loadCredentials, saveCredentials } from './src/utils/storage.js';

const BASE_URL = import.meta.env.GREEN_API_URL || 'https://api.green-api.com';

export default function App() {
  const [session, setSession] = useState(() => {
    const credentials = loadCredentials();
    if (!credentials) return null;

    return {
      api: createGreenApi({ ...credentials, baseUrl: BASE_URL }),
      credentials,
    };
  });

  const handleConnect = useCallback(({ api, credentials }) => {
    saveCredentials(credentials);
    setSession({ api, credentials });
  }, []);

  const handleLogout = useCallback(() => {
    clearCredentials();
    setSession(null);
  }, []);

  if (!session) {
    return <LoginScreen onConnect={handleConnect} baseUrl={BASE_URL} />;
  }

  return (
    <ChatApp
      api={session.api}
      credentials={session.credentials}
      onLogout={handleLogout}
    />
  );
}
