import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // The iPad opens the Mac by its Bonjour name (http://<name>.local:4173/); Vite answers only localhost and IPs unless told.
  server: { port: 5173, strictPort: true, allowedHosts: ['.local'] },
  preview: { port: 4173, strictPort: true, allowedHosts: ['.local'] },
  build: { outDir: 'dist', assetsInlineLimit: 4096, chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
