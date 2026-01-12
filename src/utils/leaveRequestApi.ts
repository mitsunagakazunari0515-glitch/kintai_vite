/**
 * 休暇申請API呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 休暇申請を表すインターフェース（APIレスポンス用）
 * leaveTypeとstatusはAPIから返される英語コード
 * leaveType: paid, special, sick, absence, other
 * status: pending, approved, rejected, deleted
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: 'paid' | 'special' | 'sick' | 'absence' | 'other';
  reason: string;
  isHalfDay: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  requestedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 休暇申請一覧取得レスポンス
 */
export interface LeaveRequestListResponse {
  requests: LeaveRequest[];
  total: number;
}

/**
 * 休暇申請作成リクエスト
 * leaveTypeはAPIに送信する英語コード（paid, special, sick, absence, other）
 */
export interface CreateLeaveRequestRequest {
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: 'paid' | 'special' | 'sick' | 'absence' | 'other';
  reason: string;
  days: number;
  isHalfDay?: boolean;
}

/**
 * 休暇申請更新リクエスト
 */
export type UpdateLeaveRequestRequest = CreateLeaveRequestRequest;

/**
 * 休暇申請却下リクエスト
 */
export interface RejectLeaveRequestRequest {
  rejectionReason?: string;
}

/**
 * 休暇申請一覧取得
 * @param employeeId 従業員ID（必須）
 * @returns 休暇申請一覧
 */
export const getLeaveRequestList = async (
  employeeId: string
): Promise<LeaveRequestListResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('employeeId', employeeId);

    const queryString = params.toString();
    const path = `/api/v1/leave-requests?${queryString}`;

    const response = await apiRequest(path, {
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
    return data.data || { requests: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch leave request list:', error);
    throw error;
  }
};

/**
 * 休暇申請詳細取得
 * @param requestId 休暇申請ID
 * @returns 休暇申請詳細
 */
export const getLeaveRequestDetail = async (requestId: string): Promise<LeaveRequest> => {
  try {
    const response = await apiRequest(`/api/v1/leave-requests/${requestId}`, {
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
    logError('Failed to fetch leave request detail:', error);
    throw error;
  }
};

/**
 * 休暇申請作成
 * @param payload 休暇申請作成データ
 * @returns 休暇申請
 */
export const createLeaveRequest = async (
  payload: CreateLeaveRequestRequest
): Promise<LeaveRequest> => {
  try {
    const response = await apiRequest('/api/v1/leave-requests', {
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
    logError('Failed to create leave request:', error);
    throw error;
  }
};

/**
 * 休暇申請更新
 * @param requestId 休暇申請ID
 * @param payload 休暇申請更新データ
 * @returns 休暇申請
 */
export const updateLeaveRequest = async (
  requestId: string,
  payload: UpdateLeaveRequestRequest
): Promise<LeaveRequest> => {
  try {
    const response = await apiRequest(`/api/v1/leave-requests/${requestId}`, {
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
    logError('Failed to update leave request:', error);
    throw error;
  }
};

/**
 * 休暇申請削除
 * @param requestId 休暇申請ID
 */
export const deleteLeaveRequest = async (requestId: string): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/leave-requests/${requestId}`, {
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
    logError('Failed to delete leave request:', error);
    throw error;
  }
};

/**
 * 休暇申請承認（管理者用）
 * @param requestId 休暇申請ID
 * @returns 休暇申請
 */
export const approveLeaveRequest = async (requestId: string): Promise<LeaveRequest> => {
  try {
    const response = await apiRequest(`/api/v1/leave-requests/${requestId}/approve`, {
      method: 'POST',
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
    logError('Failed to approve leave request:', error);
    throw error;
  }
};

/**
 * 休暇申請却下（管理者用）
 * @param requestId 休暇申請ID
 * @param payload 却下理由
 * @returns 休暇申請
 */
export const rejectLeaveRequest = async (
  requestId: string,
  payload: RejectLeaveRequestRequest
): Promise<LeaveRequest> => {
  try {
    const response = await apiRequest(`/api/v1/leave-requests/${requestId}/reject`, {
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
    logError('Failed to reject leave request:', error);
    throw error;
  }
};


