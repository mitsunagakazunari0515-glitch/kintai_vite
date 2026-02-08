/**
 * 勤務拠点マスタAPI呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 勤務拠点を表すインターフェース
 */
export interface WorkLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 勤務拠点一覧取得レスポンス
 */
export interface WorkLocationListResponse {
  workLocations: WorkLocation[];
  total: number;
}

/**
 * 勤務拠点作成リクエスト
 */
export interface CreateWorkLocationRequest {
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius: number;
  displayOrder?: number;
}

/**
 * 勤務拠点更新リクエスト
 */
export interface UpdateWorkLocationRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  allowedRadius?: number;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * 勤務拠点一覧取得
 * @param includeInactive trueの場合、削除済み（isActive=false）の拠点も含める（管理者のみ有効）
 */
export const getWorkLocations = async (
  includeInactive?: boolean
): Promise<WorkLocationListResponse> => {
  try {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    const queryString = params.toString();
    const path = queryString ? `/api/v1/work-locations?${queryString}` : '/api/v1/work-locations';

    const response = await apiRequest(path, { method: 'GET' });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      const error = new Error(errorMessage);
      (error as any).status = apiError.statusCode;
      (error as any).apiError = apiError;
      throw error;
    }

    const data = await response.json();
    return data.data || { workLocations: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch work locations:', error);
    throw error;
  }
};

/**
 * 勤務拠点詳細取得
 */
export const getWorkLocation = async (workLocationId: string): Promise<WorkLocation> => {
  try {
    const response = await apiRequest(`/api/v1/work-locations/${workLocationId}`, {
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
    logError('Failed to fetch work location:', error);
    throw error;
  }
};

/**
 * 勤務拠点作成
 */
export const createWorkLocation = async (
  payload: CreateWorkLocationRequest
): Promise<WorkLocation> => {
  try {
    const body = {
      ...payload,
      displayOrder: payload.displayOrder ?? 999,
    };

    const response = await apiRequest('/api/v1/work-locations', {
      method: 'POST',
      body: JSON.stringify(body),
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
    logError('Failed to create work location:', error);
    throw error;
  }
};

/**
 * 勤務拠点更新
 */
export const updateWorkLocation = async (
  workLocationId: string,
  payload: UpdateWorkLocationRequest
): Promise<WorkLocation> => {
  try {
    const response = await apiRequest(`/api/v1/work-locations/${workLocationId}`, {
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
    logError('Failed to update work location:', error);
    throw error;
  }
};

/**
 * 勤務拠点削除（論理削除）
 */
export const deleteWorkLocation = async (workLocationId: string): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/work-locations/${workLocationId}`, {
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
    logError('Failed to delete work location:', error);
    throw error;
  }
};
