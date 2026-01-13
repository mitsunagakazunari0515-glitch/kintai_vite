/**
 * Amplify設定管理
 * 環境に応じて適切な設定ファイルを読み込む
 */

import { warn } from '../utils/logger';

export type AmplifyEnvironment = 'development' | 'production';

/**
 * 現在の環境を取得
 * ViteのMODE（--modeフラグ）を優先的に使用
 * VITE_AMPLIFY_ENVが設定されている場合はそれを使用
 * それ以外は、development をデフォルトとする
 */
export const getAmplifyEnvironment = (): AmplifyEnvironment => {
  // ViteのMODE（npm run prod で --mode production が指定された場合）
  const viteMode = import.meta.env.MODE;
  
  // VITE_AMPLIFY_ENVが明示的に設定されている場合はそれを使用
  const explicitEnv = import.meta.env.VITE_AMPLIFY_ENV;
  
  // 優先順位: VITE_AMPLIFY_ENV > ViteのMODE > デフォルト（development）
  if (explicitEnv === 'production') {
    return 'production';
  }
  if (viteMode === 'production') {
    return 'production';
  }
  
  return 'development';
};

/**
 * 環境に応じた設定ファイルのパスを取得
 */
export const getAmplifyConfigPath = (): string => {
  const env = getAmplifyEnvironment();
  if (env === 'production') {
    return '/amplify_outputs.production.json';
  }
  return '/amplify_outputs.json';
};

/**
 * Amplify outputsからAPIエンドポイントを取得
 */
let cachedApiEndpoint: string | null = null;

export const getAmplifyApiEndpoint = (): string | null => {
  if (cachedApiEndpoint) {
    return cachedApiEndpoint;
  }
  
  try {
    // amplify_outputs.jsonが既に読み込まれている場合、そこから取得
    // 注意: これは同期的に取得できないため、非同期で取得する必要がある
    // ここではキャッシュされた値を返すのみ
    return cachedApiEndpoint;
  } catch (error) {
    return null;
  }
};

/**
 * Amplify outputsからAPIエンドポイントを設定
 */
export const setAmplifyApiEndpoint = (endpoint: string): void => {
  cachedApiEndpoint = endpoint;
};

/**
 * APIプレフィックスを取得
 * 環境変数 VITE_API_PREFIX が設定されている場合はそれを使用
 * 例: dev環境 → "dev", 本番環境 → "prod"
 * @returns {string} APIプレフィックス（設定されていない場合は空文字列）
 */
export const getApiPrefix = (): string => {
  const prefix = import.meta.env.VITE_API_PREFIX;
  if (prefix) {
    // プレフィックスが設定されている場合、先頭のスラッシュを削除して正規化
    return prefix.trim().replace(/^\/+/, '');
  }
  return '';
};

/**
 * 既存のAPI Gatewayエンドポイントを取得
 * 環境に応じて異なるエンドポイントを使用できます
 * 優先順位: amplify_outputs.json > VITE_API_ENDPOINT
 */
export const getApiEndpoint = (): string => {
  // まず、amplify_outputs.jsonから取得を試みる
  const amplifyEndpoint = getAmplifyApiEndpoint();
  if (amplifyEndpoint) {
    return amplifyEndpoint;
  }
  
  // 環境変数からエンドポイントを取得（すべての環境でVITE_API_ENDPOINTを使用）
  const endpoint = import.meta.env.VITE_API_ENDPOINT;
  if (endpoint) {
    return endpoint;
  }
  
  // エンドポイントが設定されていない場合の警告（開発環境のみ）
  const env = getAmplifyEnvironment();
  if (env === 'development') {
    warn('VITE_API_ENDPOINT is not set. Please configure in .env file or run "npx ampx sandbox" to generate amplify_outputs.json.');
  }
  return '';
};

