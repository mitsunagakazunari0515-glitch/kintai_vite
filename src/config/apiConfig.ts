/**
 * API設定管理
 * 既存のAPI Gatewayエンドポイントを環境変数から取得
 */

import { getApiEndpoint as getAmplifyApiEndpoint } from './amplifyConfig';
import { fetchAuthSession } from 'aws-amplify/auth';
import { error as logError } from '../utils/logger';
import { encodeJapaneseString } from '../utils/japaneseEncoder';

/**
 * API Gatewayエンドポイントを取得
 * 環境変数 VITE_API_ENDPOINT が設定されている場合はそれを使用
 */
export const getApiEndpoint = (): string => {
  return getAmplifyApiEndpoint();
};

/**
 * UUID v4を生成する関数
 * @returns {string} UUID v4形式の文字列
 */
export const generateRequestId = (): string => {
  // ブラウザの標準API（crypto.randomUUID）を使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // フォールバック: UUID v4を手動生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 端末情報を取得する関数
 * @returns {string} 端末情報の文字列（例: "PC/Windows/Chrome"）
 */
export const getDeviceInfo = (): string => {
  if (typeof window === 'undefined') {
    return 'Server/Unknown/Unknown';
  }

  const userAgent = navigator.userAgent;
  let deviceType = 'PC';
  let os = 'Unknown';
  let browser = 'Unknown';

  // デバイスタイプの判定
  if (/mobile|iphone|ipad|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'Mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'Tablet';
  }

  // OSの判定
  if (/windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  }

  // ブラウザの判定
  if (/edg/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera';
  }

  return `${deviceType}/${os}/${browser}`;
};

/**
 * Cognito ID Tokenを取得する関数
 * @returns {Promise<string | null>} ID Token（取得できない場合はnull）
 */
export const getIdToken = async (): Promise<string | null> => {
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.idToken) {
      return session.tokens.idToken.toString();
    }
    return null;
  } catch (error) {
    logError('Failed to fetch ID token:', error);
    return null;
  }
};

/**
 * ユーザー情報をローカルストレージから取得する関数
 * @returns {{ requestedBy: string | null; employeeId: string | null; role: string | null }} ユーザー情報
 */
export const getUserInfo = (): { requestedBy: string | null; employeeId: string | null; role: string | null } => {
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      return {
        requestedBy: userInfo.requestedBy || null,
        employeeId: userInfo.employeeId || null,
        role: userInfo.role || null
      };
    }
    return { requestedBy: null, employeeId: null, role: null };
  } catch (error) {
    logError('Failed to get user info from localStorage:', error);
    return { requestedBy: null, employeeId: null, role: null };
  }
};

/**
 * APIリクエストのオプション
 */
export interface ApiRequestOptions extends RequestInit {
  /** 認証トークンを使用するかどうか（デフォルト: true） */
  requiresAuth?: boolean;
  /** X-Request-Idを自動生成するかどうか（デフォルト: true） */
  autoRequestId?: boolean;
  /** X-Device-Infoを自動設定するかどうか（デフォルト: true） */
  autoDeviceInfo?: boolean;
  /** リクエストボディがあるかどうか（Content-Typeを設定するために使用、デフォルト: bodyの有無から自動判定） */
  hasBody?: boolean;
}

/**
 * APIリクエストを実行するヘルパー関数
 * @param {string} path - APIパス
 * @param {ApiRequestOptions} options - リクエストオプション
 * @returns {Promise<Response>} レスポンス
 */
export const apiRequest = async (
  path: string,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const endpoint = getApiEndpoint();
  if (!endpoint) {
    throw new Error('APIエンドポイントが設定されていません。amplify_outputs.jsonを確認するか、VITE_API_ENDPOINT環境変数を設定してください。');
  }
  const url = `${endpoint}${path.startsWith('/') ? path : `/${path}`}`;

  const {
    requiresAuth = true,
    autoRequestId = true,
    autoDeviceInfo = true,
    hasBody,
    headers = {},
    ...restOptions
  } = options;

  // リクエストボディの有無を判定
  const hasRequestBody = hasBody !== undefined ? hasBody : !!options.body;

  // ヘッダーを構築（Record型を使用して型安全に処理）
  const requestHeaders: Record<string, string> = {};
  
  // 既存のヘッダーをコピー
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    } else {
      Object.assign(requestHeaders, headers);
    }
  }

  // Content-Typeを設定（リクエストボディがある場合のみ）
  if (hasRequestBody && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Authorizationヘッダーを設定（認証が必要な場合）
  if (requiresAuth) {
    if (!requestHeaders['Authorization']) {
      const idToken = await getIdToken();
      if (idToken) {
        requestHeaders['Authorization'] = `Bearer ${idToken}`;
        console.log('🔐 Authorization header set:', `Bearer ${idToken.substring(0, 20)}...`);
      } else {
        console.warn('⚠️ ID Token not available. Request will fail with 401.');
        throw new Error('認証トークンを取得できませんでした。ログインしてください。');
      }
    } else {
      console.log('🔐 Authorization header already set:', requestHeaders['Authorization'].substring(0, 20) + '...');
    }
  } else {
    console.log('ℹ️ Authentication not required for this request');
  }

  // X-Request-Idを設定（自動生成が有効な場合）
  if (autoRequestId && !requestHeaders['X-Request-Id']) {
    requestHeaders['X-Request-Id'] = generateRequestId();
  }

  // X-Device-Infoを設定（自動設定が有効な場合）
  if (autoDeviceInfo && !requestHeaders['X-Device-Info']) {
    requestHeaders['X-Device-Info'] = getDeviceInfo();
  }

  // 認可APIエンドポイント判定（X-User-Roleヘッダーの設定判定に使用）
  // 添付資料「FE_AUTHORIZATION_GUIDE.md」に基づく実装
  const authEndpoints = ['/api/v1/auth/authorize', '/api/v1/auth/refresh-authorization'];
  const isAuthEndpoint = authEndpoints.some(endpoint => path.includes(endpoint));

  // ユーザー情報を一度だけ取得（複数のヘッダー設定で使用）
  const userInfo = getUserInfo();

  // X-Requested-Byを設定（共通ヘッダーとして全てのAPIリクエストに追加）
  // 注意: HTTPヘッダーにはISO-8859-1文字のみが許可されるため、常にBase64エンコードする
  // フラグ不要: デコード時に自動判定するため
  if (!requestHeaders['X-Requested-By'] && userInfo.requestedBy) {
    try {
      // 常にBase64エンコード（英語のみでも問題なく動作する）
      requestHeaders['X-Requested-By'] = encodeJapaneseString(userInfo.requestedBy);
    } catch (error) {
      // エンコードに失敗した場合は、ヘッダーを設定しない（エラーを回避）
      console.warn('Failed to encode X-Requested-By header, skipping:', error);
    }
  }

  // X-Employee-Idを設定（認可API以外のすべてのAPIリクエストに必須）
  // 添付資料「FE_AUTHORIZATION_GUIDE.md」に基づく実装
  // 認可APIエンドポイント（/api/v1/auth/authorize, /api/v1/auth/refresh-authorization）では設定しない
  // Employee IDは通常、英数字のみなので問題ないはず
  if (!isAuthEndpoint) {
    if (!requestHeaders['X-Employee-Id'] && userInfo.employeeId) {
      requestHeaders['X-Employee-Id'] = userInfo.employeeId;
      console.log('🔐 X-Employee-Id header set:', userInfo.employeeId);
    } else if (!requestHeaders['X-Employee-Id'] && !userInfo.employeeId) {
      // employeeIdが設定されていない場合の警告（認可APIを呼び出していない可能性）
      console.warn('⚠️ Warning: X-Employee-Id header is not set. Please call GET /api/v1/auth/authorize first to get your employee ID.');
      // 警告のみで、リクエストは続行（API側で400エラーが返される可能性がある）
    }
  } else {
    console.log('ℹ️ Auth endpoint detected, skipping X-Employee-Id header');
  }

  // X-User-Roleを設定（認可API以外のすべてのAPIリクエストに必須）
  // 添付資料「FE_AUTHORIZATION_GUIDE.md」に基づく実装
  // 認可APIエンドポイント（/api/v1/auth/authorize, /api/v1/auth/refresh-authorization）では設定しない
  // 従業員画面（/employee/*）からのリクエストの場合は、常に'employee'として扱う
  // 管理者であっても、従業員画面内では従業員権限で動作する
  if (!isAuthEndpoint && !requestHeaders['X-User-Role']) {
    // 現在のパスを確認（従業員画面かどうか）
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isEmployeeScreen = currentPath.startsWith('/employee/');
    
    // 従業員画面からのリクエストの場合は、常に'employee'として扱う
    if (isEmployeeScreen) {
      requestHeaders['X-User-Role'] = 'employee';
      console.log('🔐 X-User-Role header set to "employee" (employee screen detected):', currentPath);
    } else if (userInfo.role) {
      requestHeaders['X-User-Role'] = userInfo.role; // 'admin' または 'employee'
      console.log('🔐 X-User-Role header set:', userInfo.role);
    } else {
      // roleが設定されていない場合の警告（認可APIを呼び出していない可能性）
      console.warn('⚠️ Warning: X-User-Role header is not set. Please call GET /api/v1/auth/authorize first to get your role.');
      // 警告のみで、リクエストは続行（API側で400エラーが返される可能性がある）
    }
  } else if (isAuthEndpoint) {
    console.log('ℹ️ Auth endpoint detected, skipping X-User-Role header');
  }

  return fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });
};

/**
 * 認証付きAPIリクエストを実行（後方互換性のため残す）
 * @deprecated apiRequestを使用してください（requiresAuthオプションで制御可能）
 * @param {string} path - APIパス
 * @param {string} token - 認証トークン（未使用、ID Tokenを自動取得）
 * @param {RequestInit} options - リクエストオプション
 * @returns {Promise<Response>} レスポンス
 */
export const authenticatedApiRequest = async (
  path: string,
  _token: string, // 後方互換性のため残すが、実際には使用されない（ID Tokenを自動取得）
  options: RequestInit = {}
): Promise<Response> => {
  return apiRequest(path, {
    ...options,
    requiresAuth: true,
  });
};

/**
 * 認証なしAPIリクエストを実行
 * @param {string} path - APIパス
 * @param {ApiRequestOptions} options - リクエストオプション
 * @returns {Promise<Response>} レスポンス
 */
export const unauthenticatedApiRequest = async (
  path: string,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  return apiRequest(path, {
    ...options,
    requiresAuth: false,
  });
};
