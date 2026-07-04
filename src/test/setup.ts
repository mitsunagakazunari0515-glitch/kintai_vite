/**
 * Vitest グローバルセットアップ
 * 各テストファイル実行前に読み込まれる（vite.config.ts の test.setupFiles で指定）
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals: false のため、@testing-library/react の自動クリーンアップが効かない。
// 各テスト後にDOMを明示的にアンマウントし、テスト間でレンダリング結果が残らないようにする。
afterEach(() => {
  cleanup();
});
