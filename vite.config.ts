/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  test: {
    environment: 'jsdom',
    // globalsは無効のまま、各テストファイルで `import { describe, it, expect } from 'vitest'` を明示する
    // （.eslintrc.cjsにvitest用のグローバル定義を追加せずに済むため）
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['node_modules', 'dist'],
  }
})
