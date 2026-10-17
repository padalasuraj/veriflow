import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3001' } },
  test: { environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'] },
});
