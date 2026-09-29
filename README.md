# WhatsApp-чат на GREEN-API

Веб-прототип мессенджера WhatsApp: React-интерфейс для отправки и получения текстовых сообщений через [GREEN-API](https://green-api.com). Приложение работает целиком в браузере — без бэкенда, запросы идут напрямую в API (CORS разрешён).

**Демо:** https://stasithyst.github.io/green-api/

## Возможности

- Вход по `idInstance` / `apiTokenInstance` с проверкой состояния инстанса (не authorized / starting / sleepMode / blocked / suspended и т.д.)
- Список чатов с аватарами, последним сообщением, временем и поиском
- Диалог: лента сообщений, поле ввода, отправка по Enter
- Создание нового чата по номеру телефона (нормализация `8…` → `7…`, формат `…@c.us`)
- Входящие сообщения в реальном времени через long-polling `receiveNotification`
- Статусы отправленных сообщений (`sent` / `delivered` / `read` / `deleted`)
- Смена состояния инстанса прилетает по уведомлениям и сразу отражается в UI

## Стек

React 18 · Vite 5 · SCSS (модульные файлы стилей) · GREEN-API REST

## Быстрый старт

```bash
npm ci
npm run dev
```

Dev-сервер поднимается на `http://localhost:5173/green-api/` (путь `/green-api/` задано `base` в `vite.config.js` — нужно и для локального запуска, и для GitHub Pages).

Команды:

| Команда | Что делает |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm run build` | production-сборка в `dist/` |
| `npm run preview` | локальный просмотр собранной версии |

## Настройка

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com), создайте инстанс и отсканируйте QR-код WhatsApp.
2. Скопируйте `idInstance` и `apiTokenInstance` и введите их на экране входа.
3. Ключи сохраняются в `localStorage` (`green-api-chat.credentials.v1`) — выход из аккаунта очищает их. Переписка в памяти не сохраняется и сбрасывается при перезагрузке.

Опционально можно переопределить адрес API переменной окружения (передаётся в клиент через `envPrefix` в `vite.config.js`):

```bash
# .env.local
GREEN_API_URL=https://api.green-api.com
```

## Деплой на GitHub Pages

`.github/workflows/deploy.yml` собирает проект и публикует его при каждом push в `main` (actions/upload-pages-artifact + actions/deploy-pages). В настройках репозитория включено: **Settings → Pages → Source: GitHub Actions**.

При первом запуске workflow может упасть с ошибкой, если Pages ещё не был включён — повторите запуск вкладки **Actions → Deploy to GitHub Pages → Re-run all jobs**.

## Ограничения прототипа

- только текстовые сообщения (медиа, голосовые, стикеры не поддерживаются)
- история живёт в оперативной памяти: после F5 переписка начинается заново
- нет серверного хранения и синхронизации между устройствами
