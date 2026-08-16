import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where the API (Vikteur/spotify-to-rekordbox) is during `npm run dev`.
const apiTarget = process.env.API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? '8000'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget,
    },
  },
  // `vite preview` serves the real build; give it the same proxy so a built
  // bundle can be exercised against a local API too.
  preview: {
    proxy: {
      '/api': apiTarget,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
