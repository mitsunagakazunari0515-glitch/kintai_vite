/**
 * 控除マスタAPI呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 控除マスタを表すインターフェース
 */
export interface Deduction {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 控除マスタ一覧取得レスポンス
 */
export interface DeductionListResponse {
  deductions: Deduction[];
  total: number;
}

/**
 * 控除マスタ作成リクエスト
 */
export interface CreateDeductionRequest {
  name: string;
}

/**
 * 控除マスタ更新リクエスト
 */
export type UpdateDeductionRequest = CreateDeductionRequest;

/**
 * 控除マスタ一覧取得
 * @returns 控除マスタ一覧
 */
export const getDeductions = async (): Promise<DeductionListResponse> => {
  try {
    const response = await apiRequest('/api/v1/deductions', {
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
    return data.data || { deductions: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch deductions:', error);
    throw error;
  }
};

/**
 * 控除マスタ詳細取得
 * @param deductionId 控除ID
 * @returns 控除マスタ詳細
 */
export const getDeduction = async (deductionId: string): Promise<Deduction> => {
  try {
    const response = await apiRequest(`/api/v1/deductions/${deductionId}`, {
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
    logError('Failed to fetch deduction:', error);
    throw error;
  }
};

/**
 * 控除マスタ作成
 * @param payload 控除マスタ作成データ
 * @returns 控除マスタ
 */
export const createDeduction = async (payload: CreateDeductionRequest): Promise<Deduction> => {
  try {
    const response = await apiRequest('/api/v1/deductions', {
      method: 'POST',
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
    logError('Failed to create deduction:', error);
    throw error;
  }
};

/**
 * 控除マスタ更新
 * @param deductionId 控除ID
 * @param payload 控除マスタ更新データ
 * @returns 控除マスタ
 */
export const updateDeduction = async (
  deductionId: string,
  payload: UpdateDeductionRequest
): Promise<Deduction> => {
  try {
    const response = await apiRequest(`/api/v1/deductions/${deductionId}`, {
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
    logError('Failed to update deduction:', error);
    throw error;
  }
};

/**
 * 控除マスタ削除
 * @param deductionId 控除ID
 */
export const deleteDeduction = async (deductionId: string): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/deductions/${deductionId}`, {
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
    logError('Failed to delete deduction:', error);
    throw error;
  }
};


