export function toChatId(input) {
  const value = String(input || '').trim();
  if (!value) return '';

  if (value.includes('@')) return value;

  let digits = value.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (!digits) return '';
  return `${digits}@c.us`;
}

export function normalizePhoneInput(value) {
  const raw = String(value || '');
  if (raw.includes('@')) return raw;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  return raw;
}

function chatIdToPhone(chatId) {
  return String(chatId || '').split('@')[0];
}

export function isValidChatId(chatId) {
  return /^\+?\d{7,15}@c\.us$/.test(String(chatId || ''));
}

export function chatTitle(chatId, name) {
  const clean = String(name || '').trim();
  if (clean) return clean;

  const phone = chatIdToPhone(chatId);
  return phone.startsWith('+') ? phone : `+${phone}`;
}

export function prettyPhone(chatId) {
  const phone = chatIdToPhone(chatId);
  if (phone.startsWith('+')) return phone;
  return `+${phone}`;
}

const AVATAR_COLORS = [
  '#6a7bc4', '#7d5ba6', '#c46a3f', '#3f83a8',
  '#a8637a', '#4a8c5b', '#b0853a', '#5f6fb0',
];

export function avatarColor(seed) {
  const value = String(seed || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatDivider(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';

  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const dayDiff = Math.round((today - day) / 86400000);

  if (dayDiff === 0) return 'Сегодня';
  if (dayDiff === 1) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function formatListTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';

  if (startOfDay(date) === startOfDay(new Date())) return formatTime(timestamp);

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() === new Date().getFullYear() ? '2-digit' : 'numeric',
  });
}
