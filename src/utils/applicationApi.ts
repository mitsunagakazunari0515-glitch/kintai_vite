/**
 * 申請一覧API呼び出しユーティリティ
 * 休暇申請と打刻修正申請を統合した申請一覧を取得・更新するAPI
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 統合申請を表すインターフェース（APIレスポンス用）
 * type: 'leave_request' | 'attendance_correction_request'
 * status: 'pending' | 'approved' | 'rejected' | 'deleted'
 */
export interface UnifiedApplication {
  id: string;
  type: 'leave_request' | 'attendance_correction_request';
  employeeId: string;
  employeeName: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  requestedAt: string;
  /** 休暇申請のフィールド（typeが'leave_request'の場合に存在） */
  leaveData?: {
    startDate: string;
    endDate: string;
    days: number;
    leaveType: 'paid' | 'special' | 'sick' | 'absence' | 'other';
    reason: string;
    isHalfDay: boolean;
  };
  /** 打刻修正申請のフィールド（typeが'attendance_correction_request'の場合に存在） */
  attendanceData?: {
    date: string;
    originalClockIn: string | null;
    originalClockOut: string | null;
    requestedClockIn: string;
    requestedClockOut: string | null;
    requestedBreaks: Array<{ start: string; end: string | null }>;
    reason: string;
  };
}

/**
 * 申請一覧取得レスポンス
 */
export interface ApplicationListResponse {
  requests: UnifiedApplication[];
  total: number;
}

/**
 * 申請一覧取得
 * @param startYearMonth 開始年月（YYYY-MM形式、オプション）
 * @param endYearMonth 終了年月（YYYY-MM形式、オプション）
 * @param type 申請種別でフィルタ（'leave_request' | 'attendance_correction_request'、オプション）
 * @param status ステータスでフィルタ（'pending' | 'approved' | 'rejected' | 'deleted'、オプション）
 * @returns 申請一覧
 */
export const getApplicationList = async (
  startYearMonth?: string,
  endYearMonth?: string,
  type?: string,
  status?: string
): Promise<ApplicationListResponse> => {
  try {
    const params = new URLSearchParams();
    if (startYearMonth) {
      params.append('startYearMonth', startYearMonth);
    }
    if (endYearMonth) {
      params.append('endYearMonth', endYearMonth);
    }
    if (type) {
      params.append('type', type);
    }
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    const path = queryString ? `/api/v1/applications?${queryString}` : '/api/v1/applications';

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
    logError('Failed to fetch application list:', error);
    throw error;
  }
};

/**
 * 申請ステータス更新リクエスト
 */
export interface UpdateApplicationStatusRequest {
  requestId: string;
  type: 'leave_request' | 'attendance_correction_request';
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

/**
 * 申請ステータス更新（承認・却下）
 * @param payload 申請ステータス更新データ
 */
export const updateApplicationStatus = async (
  payload: UpdateApplicationStatusRequest
): Promise<void> => {
  try {
    const response = await apiRequest('/api/v1/applications/status', {
      method: 'PATCH',
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
  } catch (error) {
    logError('Failed to update application status:', error);
    throw error;
  }
};

