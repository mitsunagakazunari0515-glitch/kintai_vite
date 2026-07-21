/**
 * 有給休暇APIのユーティリティ関数
 * 有給残高の取得と、労基法準拠の自動付与の同期を提供します。
 * バックエンド `paid-leave.router.ts` / `paid-leave-grant.service.ts` に対応。
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError, ApiRequestError } from './apiErrorTranslator';

/**
 * 有給残高: 付与1件分（消化をFIFO割当した後の残＝繰越を含む）。
 * バックエンド `api.types.ts` の `PaidLeaveBalanceGrant` と一致させること。
 */
export interface PaidLeaveBalanceGrant {
  /** 付与台帳ID（AUTO-... は自動付与、EMP-... は手動付与）。 */
  grantLedgerId: string;
  /** 付与日（YYYY-MM-DD）。 */
  grantDate: string;
  /** 付与日数。 */
  grantDays: number;
  /** 有効期限（YYYY-MM-DD）。 */
  expirationDate: string | null;
  /** この付与の残日数（＝繰越数）。 */
  remainingDays: number;
}

/**
 * 有給残高レスポンス（`GET /api/v1/paid-leave/:employeeId`）。
 * バックエンド `api.types.ts` の `PaidLeaveBalanceResponse` と一致させること。
 */
export interface PaidLeaveBalance {
  employeeId: number;
  /** 付与日昇順。 */
  grants: PaidLeaveBalanceGrant[];
  /** 有効付与残の合計。 */
  totalRemaining: number;
  /** 残ありの付与のうち直近で失効する期限（YYYY-MM-DD）。 */
  nextExpiration: string | null;
}

/** 有給自動付与の同期結果（`POST /api/v1/paid-leave/:employeeId/sync`）。 */
export interface SyncPaidLeaveResult {
  employeeId: number;
  created: number;
  skippedReason?: 'not_found' | 'not_full_time';
}

/**
 * 指定従業員の有給残高を取得する。
 * サーバー側で自動付与を冪等同期してから、付与ごとの残（繰越）・合計残・直近失効期限を返す。
 *
 * @param employeeId 従業員ID。
 * @returns 有給残高。
 */
export const getPaidLeaveBalance = async (employeeId: string): Promise<PaidLeaveBalance> => {
  try {
    const response = await apiRequest(`/api/v1/paid-leave/${employeeId}`, {
      method: 'GET',
    });
    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }
    const data = await response.json();
    return data.data as PaidLeaveBalance;
  } catch (error) {
    logError('Failed to fetch paid leave balance:', error);
    throw error;
  }
};

/**
 * 指定従業員の有給自動付与を同期する（管理者のみ）。
 *
 * @param employeeId 従業員ID。
 * @returns 同期結果。
 */
export const syncPaidLeaveGrants = async (employeeId: string): Promise<SyncPaidLeaveResult> => {
  try {
    const response = await apiRequest(`/api/v1/paid-leave/${employeeId}/sync`, {
      method: 'POST',
    });
    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }
    const data = await response.json();
    return data.data as SyncPaidLeaveResult;
  } catch (error) {
    logError('Failed to sync paid leave grants:', error);
    throw error;
  }
};

/**
 * 全正社員の有給自動付与を一括同期する（管理者のみ）。
 *
 * @returns 合計作成件数と従業員ごとの結果。
 */
export const syncAllPaidLeaveGrants = async (): Promise<{ totalCreated: number; results: SyncPaidLeaveResult[] }> => {
  try {
    const response = await apiRequest('/api/v1/paid-leave/sync', {
      method: 'POST',
    });
    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }
    const data = await response.json();
    return data.data as { totalCreated: number; results: SyncPaidLeaveResult[] };
  } catch (error) {
    logError('Failed to sync all paid leave grants:', error);
    throw error;
  }
};
