/**
 * API設定管理
 * 既存のAPI Gatewayエンドポイントを環境変数から取得
 */

import { getApiEndpoint as getAmplifyApiEndpoint } from './amplifyConfig';

/**
 * API Gatewayエンドポイントを取得
 * 環境変数 VITE_API_ENDPOINT が設定されている場合はそれを使用
 */
export const getApiEndpoint = (): string => {
  return getAmplifyApiEndpoint();
};

/**
 * APIリクエストを実行するヘルパー関数
 */
export const apiRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const endpoint = getApiEndpoint();
  const url = `${endpoint}${path.startsWith('/') ? path : `/${path}`}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 認証トークンがある場合は追加
  if (options.headers && 'Authorization' in options.headers) {
    defaultHeaders['Authorization'] = options.headers['Authorization'] as string;
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

/**
 * 認証付きAPIリクエストを実行
 */
export const authenticatedApiRequest = async (
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> => {
  return apiRequest(path, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};

