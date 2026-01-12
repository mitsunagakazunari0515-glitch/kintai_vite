/**
 * 認証認可API呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 認可情報を表すインターフェース
 * API仕様に基づき、firstName（苗字/姓）とlastName（名前/名）が別々のフィールドで返されます
 */
export interface AuthorizationResponse {
  employeeId: string;
  firstName: string;  // 苗字（姓）（必須）
  lastName: string;   // 名前（名）（必須）
  email: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  joinDate: string;
  leaveDate: string | null;
}

/**
 * 認可情報取得
 * @returns 認可情報
 */
export const getAuthorization = async (): Promise<AuthorizationResponse> => {
  try {
    const response = await apiRequest('/api/v1/auth/authorize', {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      // エラー情報を保持
      (error as any).status = apiError.statusCode;
      (error as any).isUnauthorized = apiError.statusCode === 401;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to get authorization:', error);
    throw error;
  }
};

/**
 * 認可情報更新（トークンリフレッシュ時）
 * @returns 認可情報
 */
export const refreshAuthorization = async (): Promise<AuthorizationResponse> => {
  try {
    const response = await apiRequest('/api/v1/auth/refresh-authorization', {
      method: 'POST',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      // エラー情報を保持
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to refresh authorization:', error);
    throw error;
  }
};


