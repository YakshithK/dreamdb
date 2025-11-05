import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds default timeout
    hookTimeout: 30000,
    globals: true,
    environment: 'node',
  },
});
