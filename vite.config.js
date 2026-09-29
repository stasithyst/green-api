import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Приложение ходит в GREEN-API напрямую из браузера —
 * сервис разрешает CORS (Access-Control-Allow-Origin: *), прокси не нужен.
 */
export default defineConfig({
  // GitHub Pages публикует сайт не в корне домена, а в /<repo>/,
  // поэтому все ссылки на сборку должны начинаться с этого пути.
  base: '/green-api/',
  plugins: [react()],
  // Отдаём переменные GREEN_* в клиентский код (import.meta.env),
  // чтобы адрес API совпадал с настройками в личном кабинете.
  envPrefix: ['VITE_', 'GREEN_'],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
