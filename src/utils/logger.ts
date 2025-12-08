/**
 * ファイル名: logger.ts
 * 説明: 開発環境でのみconsoleログを出力するユーティリティ
 */

/**
 * 開発環境かどうかを判定
 */
const isDev = import.meta.env.DEV;

/**
 * console.logのラッパー関数
 * 開発環境でのみログを出力します
 */
export const log = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * console.errorのラッパー関数
 * 開発環境でのみログを出力します
 */
export const error = (...args: unknown[]) => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * console.warnのラッパー関数
 * 開発環境でのみログを出力します
 */
export const warn = (...args: unknown[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * console.infoのラッパー関数
 * 開発環境でのみログを出力します
 */
export const info = (...args: unknown[]) => {
  if (isDev) {
    console.info(...args);
  }
};

/**
 * console.debugのラッパー関数
 * 開発環境でのみログを出力します
 */
export const debug = (...args: unknown[]) => {
  if (isDev) {
    console.debug(...args);
  }
};

