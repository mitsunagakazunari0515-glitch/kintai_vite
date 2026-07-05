/**
 * 勤怠API呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError, ApiRequestError } from './apiErrorTranslator';

/**
 * 休憩時間を表すインターフェース（APIレスポンス用）
 */
export interface Break {
  id: string;
  start: string;
  end: string | null;
}

/**
 * 休憩時間を表すインターフェース（APIリクエスト用）
 * 勤怠記録更新APIではidは不要
 */
export interface BreakRequest {
  start: string;
  end: string | null;
}

/**
 * 勤怠記録を表すインターフェース（APIレスポンス用）
 * statusはAPIから返される英語コード（not_started, working, on_break, completed）
 */
/**
 * 休日/平日扱いの上書き区分。
 * - `'weekday'`: 所定労働扱い（土日でも残業をつけない。例: GW明けの通常営業土曜）
 * - `'holiday'`: 休日出勤扱い（平日でも全労働時間を残業扱い）
 * - `null`/未指定: 曜日で自動判定（従来動作。土日=休日出勤扱い）
 */
export type DayTypeOverride = 'weekday' | 'holiday';

export interface AttendanceLog {
  attendanceId: string;
  employeeId: string;
  employeeName?: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: Break[];
  status: 'not_started' | 'working' | 'on_break' | 'completed';
  overtimeMinutes?: number;
  lateNightMinutes?: number;
  totalWorkMinutes?: number;
  /** 休日/平日扱いの上書き区分。null=曜日で自動判定 */
  dayTypeOverride?: DayTypeOverride | null;
  /** その日を最終的に休日出勤扱いとするか（dayTypeOverride を反映した確定判定）。休日出勤日数の集計はこれを使う */
  isHolidayWork?: boolean;
  memo?: string | null;
  updatedBy?: string;
  updatedAt: string;
}

/**
 * 勤怠記録一覧取得レスポンス
 */
export interface AttendanceListResponse {
  logs: AttendanceLog[];
  total: number;
}

/**
 * 出勤簿サマリー情報
 */
export interface AttendanceSummary {
  yearMonth: string;
  employeeName: string;
  scheduledWorkDays: number;
  /** 実労働時間（分）— 打刻＋有給所定換算（GET /api/v1/attendance/my-records の summary） */
  actualWorkHours: number;
  /** 実残業時間（分）— 通常残業帯のみ。深夜帯は含めない */
  actualOvertimeHours: number;
  /** 深夜残業時間（分）— 深夜帯の合計 */
  lateNightOvertimeHours?: number;
  actualWorkDays: number;
  weekdayWorkDays: number;
  holidayWorkDays: number;
  absenceDays: number;
  annualPaidLeaveDays: number;
  usedPaidLeaveDays: number;
  remainingPaidLeaveDays: number;
  paidLeaveExpirationDate: string;
  /** 期間集計（前月26〜当月25 等）で dailyLabor から算出した有給換算の合計（分）— 表示用 */
  paidLeaveConvertedMinutes?: number;
  /** 打刻のみの合計（分）— 表示用 */
  timeRecordOnlyMinutes?: number;
}

/**
 * GET /api/v1/attendance/my-records の data.dailyLabor（日別労働内訳）
 * @see docs/FE_PAID_LEAVE_LABOR_HOURS.md
 */
export type LaborDayKind =
  | 'NONE'
  | 'ATTENDANCE_ONLY'
  | 'PAID_LEAVE_ONLY'
  | 'ATTENDANCE_AND_PAID_LEAVE';

export interface DailyLaborRow {
  workDate: string;
  timeRecordMinutes: number | null;
  paidLeaveMinutes: number;
  laborMinutes: number;
  laborDayKind: LaborDayKind;
}

/**
 * 出勤簿一覧取得レスポンス
 */
export interface AttendanceMyRecordsResponse {
  summary: AttendanceSummary;
  logs: AttendanceLog[];
  total: number;
  /** 日別の打刻／有給／合計（任意） */
  dailyLabor?: DailyLaborRow[];
}


/**
 * 勤怠記録更新リクエスト
 */
export interface UpdateAttendanceRequest {
  employeeId: string;
  workDate: string;
  clockIn?: string | null;
  clockOut?: string | null;
  breaks?: BreakRequest[];
  /**
   * 休日/平日扱いの上書き区分。'weekday'=土日でも残業をつけない, 'holiday'=平日でも休日出勤扱い,
   * null=曜日で自動判定に戻す。省略時は変更しない。
   */
  dayTypeOverride?: DayTypeOverride | null;
}

/**
 * 勤怠記録メモ更新リクエスト
 * 注意: エンドポイントは `/api/v1/attendance/memo` です（API仕様書に基づく）
 */
export interface UpdateAttendanceMemoRequest {
  employeeId: string;
  workDate: string;
  memo?: string | null;
}

/**
 * 勤怠ログ1件が「休日出勤扱い」かどうかを判定する。
 *
 * 休日出勤日数の集計を単一箇所に集約するためのヘルパー（フロント側の曜日判定の二重実装を解消）。
 * 出退勤が揃っていない日はカウント対象外。バックエンドが返す `isHolidayWork`（`dayTypeOverride` 反映済みの
 * 確定判定）を優先し、これにより土曜の通常出勤（`dayTypeOverride='weekday'`）も正しく休日出勤から除外される。
 * 旧レスポンス互換で `isHolidayWork` が無い場合のみ、従来どおり曜日（土日）で判定する。
 *
 * @param {Pick<AttendanceLog, 'clockIn' | 'clockOut' | 'workDate' | 'isHolidayWork'>} log - 判定対象の勤怠ログ
 * @returns {boolean} その日を休日出勤としてカウントするなら true
 */
export const isHolidayWorkLog = (
  log: Pick<AttendanceLog, 'clockIn' | 'clockOut' | 'workDate' | 'isHolidayWork'>
): boolean => {
  if (!log.clockIn || !log.clockOut) return false;
  if (typeof log.isHolidayWork === 'boolean') return log.isHolidayWork;
  const day = new Date(log.workDate).getDay();
  return day === 0 || day === 6; // 日曜=0, 土曜=6
};

/**
 * 勤怠記録一覧取得
 * @param employeeId 従業員ID（オプション、管理者の場合のみ指定可能）
 * @param startDate 開始日（YYYY-MM-DD、オプション）
 * @param endDate 終了日（YYYY-MM-DD、オプション）
 * @returns 勤怠記録一覧
 */
export const getAttendanceList = async (
  employeeId?: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceListResponse> => {
  try {
    const params = new URLSearchParams();
    if (employeeId) {
      params.append('employeeId', employeeId);
    }
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }

    const queryString = params.toString();
    const path = queryString ? `/api/v1/attendance?${queryString}` : '/api/v1/attendance';

    const response = await apiRequest(path, {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data || { logs: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch attendance list:', error);
    throw error;
  }
};

/**
 * 出勤簿一覧取得
 * @param year 年（YYYY形式、例: 2025）
 * @param month 月（MM形式、例: 11）
 * @param employeeId 従業員ID（オプション、管理者の場合のみ指定可能）
 * @returns 出勤簿一覧（サマリー情報とログ）
 */
export const getAttendanceMyRecords = async (
  year: string,
  month: string,
  employeeId?: string
): Promise<AttendanceMyRecordsResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('year', year);
    params.append('month', month);
    if (employeeId) {
      params.append('employeeId', employeeId);
    }

    const queryString = params.toString();
    const path = `/api/v1/attendance/my-records?${queryString}`;

    const response = await apiRequest(path, {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data || { summary: {} as AttendanceSummary, logs: [], total: 0 };
  } catch (error) {
    logError('Failed to fetch attendance my records:', error);
    throw error;
  }
};

/**
 * 勤怠記録詳細取得
 * @param attendanceId 勤怠記録ID
 * @returns 勤怠記録詳細
 */
export const getAttendanceDetail = async (attendanceId: string): Promise<AttendanceLog> => {
  try {
    const response = await apiRequest(`/api/v1/attendance/${attendanceId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to fetch attendance detail:', error);
    throw error;
  }
};

/**
 * 打刻時・休憩時の位置情報（オプション）
 */
export interface StampLocation {
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 精度（メートル） */
  accuracy: number;
}

/**
 * 出勤打刻
 * 注意: リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
 * 出勤日はサーバー側（API）で現在の日付を自動的に使用します
 * 出勤時刻はサーバー側（API）で現在時刻を自動的に使用します
 * @param location 位置情報（オプション）。取得した座標と精度を送信
 * @returns 勤怠記録
 */
export const clockIn = async (location?: StampLocation): Promise<AttendanceLog> => {
  try {
    const body = location
      ? JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
      : undefined;

    const response = await apiRequest('/api/v1/attendance/clock-in', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to clock in:', error);
    throw error;
  }
};

/**
 * 退勤打刻
 * 注意: リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
 * 退勤日はサーバー側（API）で現在の日付を自動的に使用します
 * 退勤時刻はサーバー側（API）で現在時刻を自動的に使用します
 * @param location 位置情報（オプション）。取得した座標と精度を送信
 * @returns 勤怠記録
 */
export const clockOut = async (location?: StampLocation): Promise<AttendanceLog> => {
  try {
    const body = location
      ? JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
      : undefined;

    const response = await apiRequest('/api/v1/attendance/clock-out', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to clock out:', error);
    throw error;
  }
};

/**
 * 休憩開始
 * 注意: エンドポイントは `/api/v1/attendance/break/start` です（API仕様書に基づく）
 * リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
 * 休憩開始日はサーバー側（API）で現在の日付を自動的に使用します
 * 休憩開始時刻はサーバー側（API）で現在時刻を自動的に使用します
 * @returns 勤怠記録
 */
export const startBreak = async (): Promise<AttendanceLog> => {
  try {
    const response = await apiRequest('/api/v1/attendance/break/start', {
      method: 'POST',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to start break:', error);
    throw error;
  }
};

/**
 * 休憩終了
 * 注意: エンドポイントは `/api/v1/attendance/break/end` です（API仕様書に基づく）
 * リクエストボディは不要です（日付と時刻はサーバー側で自動的に取得されます）
 * 休憩終了日はサーバー側（API）で現在の日付を自動的に使用します
 * 休憩終了時刻はサーバー側（API）で現在時刻を自動的に使用します
 * 指定された日付の勤怠記録に存在する最新の未終了の休憩記録を終了します
 * @returns 勤怠記録
 */
export const endBreak = async (): Promise<AttendanceLog> => {
  try {
    const response = await apiRequest('/api/v1/attendance/break/end', {
      method: 'POST',
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to end break:', error);
    throw error;
  }
};

/**
 * 勤怠記録更新
 * 従業員は自分の記録のみ更新可能、管理者は全記録を更新可能
 * @param payload 更新データ（employeeId、workDateを含む）
 * @returns 勤怠記録
 */
export const updateAttendance = async (
  payload: UpdateAttendanceRequest
): Promise<AttendanceLog> => {
  try {
    const response = await apiRequest('/api/v1/attendance', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logError('Failed to update attendance:', error);
    throw error;
  }
};

/**
 * 勤怠記録メモ更新
 * 注意: エンドポイントは `/api/v1/attendance/memo` です（API仕様書に基づく）
 * attendanceIdはリクエストボディに含まれます
 * @param payload メモ更新データ（attendanceIdとmemoを含む）
 * @returns void（API仕様書によると、レスポンスは`{"statusCode": 200, "message": "success"}`のみ）
 */
export const updateAttendanceMemo = async (
  payload: UpdateAttendanceMemoRequest
): Promise<void> => {
  try {
    const response = await apiRequest('/api/v1/attendance/memo', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const apiError = await extractApiError(response);
      const errorMessage = translateApiError(apiError);
      throw new ApiRequestError(errorMessage, { status: apiError.statusCode, apiError });
    }

    // API仕様書によると、レスポンスボディは`{"statusCode": 200, "message": "success"}`のみ
    // レスポンスを読み取って検証（必要に応じて）
    const data = await response.json();
    if (data.statusCode !== 200) {
      throw new Error(data.message || 'Failed to update attendance memo');
    }
  } catch (error) {
    logError('Failed to update attendance memo:', error);
    throw error;
  }
};


