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
 * 既存のAPI Gatewayエンドポイントを取得
 * 環境に応じて異なるエンドポイントを使用できます
 */
export const getApiEndpoint = (): string => {
  const env = getAmplifyEnvironment();
  
  // 環境固有のエンドポイントがある場合はそれを使用
  if (env === 'production') {
    const prodEndpoint = import.meta.env.VITE_API_ENDPOINT_PRODUCTION;
    if (prodEndpoint) {
      return prodEndpoint;
    }
  }
  
  // デフォルトのエンドポイント
  const endpoint = import.meta.env.VITE_API_ENDPOINT;
  if (endpoint) {
    return endpoint;
  }
  
  // エンドポイントが設定されていない場合の警告
  warn('VITE_API_ENDPOINT is not set. Please configure in .env file.');
  return '';
};

