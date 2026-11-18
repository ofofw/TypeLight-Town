import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/preview/**/*.preview.tsx'],
    environment: 'node',
    testTimeout: 180_000,
  },
});
