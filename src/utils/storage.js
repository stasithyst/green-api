const STORAGE_KEY = 'green-api-chat.credentials.v1';

export function loadCredentials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.idInstance || !parsed.apiTokenInstance) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  }
  catch {}
}

export function clearCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  }
  catch {}
}
