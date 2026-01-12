/**
 * 手当マスタAPI呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 手当マスタを表すインターフェース
 */
export interface Allowance {
  id: string;
  name: string;
  color: string;
  includeInOvertime: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 手当マスタ一覧取得レスポンス
 */
export interface AllowanceListResponse {
  allowances: Allowance[];
  total: number;
}

/**
 * 手当マスタ作成リクエスト
 */
export interface CreateAllowanceRequest {
  name: string;
  color: string;
  includeInOvertime?: boolean;
}

/**
 * 手当マスタ更新リクエスト
 */
export type UpdateAllowanceRequest = CreateAllowanceRequest;

/**
 * 手当マスタ一覧取得
 * @returns 手当マスタ一覧
 */
export const getAllowances = async (): Promise<AllowanceListResponse> => {
  try {
    const response = await apiRequest('/api/v1/allowances', {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data || { allowances: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch allowances:', error);
    throw error;
  }
};

/**
 * 手当マスタ詳細取得
 * @param allowanceId 手当ID
 * @returns 手当マスタ詳細
 */
export const getAllowance = async (allowanceId: string): Promise<Allowance> => {
  try {
    const response = await apiRequest(`/api/v1/allowances/${allowanceId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to fetch allowance:', error);
    throw error;
  }
};

/**
 * 手当マスタ作成
 * @param payload 手当マスタ作成データ
 * @returns 手当マスタ
 */
export const createAllowance = async (payload: CreateAllowanceRequest): Promise<Allowance> => {
  try {
    // リクエストボディの検証
    if (!payload.name || !payload.name.trim()) {
      throw new Error('手当名は必須です');
    }
    if (!payload.color || !payload.color.trim()) {
      throw new Error('手当の表示色は必須です');
    }
    
    const requestBody = JSON.stringify(payload);
    
    const response = await apiRequest('/api/v1/allowances', {
      method: 'POST',
      body: requestBody,
    });

    if (!response.ok) {
      // extractApiErrorがresponseを読み取るため、先にcloneを作成
      const clonedResponse = response.clone();
      
      try {
        const apiError = await extractApiError(clonedResponse);
        const errorMessage = translateApiError(apiError);
        const error = new Error(errorMessage);
        (error as any).status = apiError.statusCode;
        (error as any).apiError = apiError;
        throw error;
      } catch (parseError: any) {
        // extractApiErrorが失敗した場合（レスポンスがJSON形式でない場合など）
        logError('createAllowance: Failed to parse error response:', parseError);
        
        // 元のレスポンスを読み取って詳細を確認
        let responseText: string;
        try {
          responseText = await response.text();
        } catch (textError) {
          logError('createAllowance: Failed to read error response body:', textError);
          responseText = '';
        }
        
        const error = new Error(`手当マスタの登録に失敗しました (HTTP ${response.status})`);
        (error as any).status = response.status;
        (error as any).responseText = responseText;
        throw error;
      }
    }

    const responseText = await response.text();
    
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logError('createAllowance: Failed to parse response as JSON:', parseError);
      throw new Error('サーバーからのレスポンスの解析に失敗しました');
    }
    
    // レスポンス構造を確認: data.data または data のどちらか
    if (data.data) {
      return data.data;
    } else if (data.id) {
      // 直接オブジェクトが返される場合（API仕様書通りの形式）
      return data;
    } else {
      logError('createAllowance: Unexpected response structure:', data);
      throw new Error('予期しないレスポンス形式です');
    }
  } catch (error) {
    logError('Failed to create allowance:', error);
    throw error;
  }
};

/**
 * 手当マスタ更新
 * @param allowanceId 手当ID
 * @param payload 手当マスタ更新データ
 * @returns 手当マスタ
 */
export const updateAllowance = async (
  allowanceId: string,
  payload: UpdateAllowanceRequest
): Promise<Allowance> => {
  try {
    const response = await apiRequest(`/api/v1/allowances/${allowanceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to update allowance:', error);
    throw error;
  }
};

/**
 * 手当マスタ削除
 * @param allowanceId 手当ID
 */
export const deleteAllowance = async (allowanceId: string): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/allowances/${allowanceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }
  } catch (error) {
    logError('Failed to delete allowance:', error);
    throw error;
  }
};


