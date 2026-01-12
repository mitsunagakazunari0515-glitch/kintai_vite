/**
 * 給与明細API呼び出しユーティリティ
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 給与明細APIレスポンスの型定義
 */
export interface PayrollApiResponse {
  payrollId: string;
  year: number;
  month: number;
  statementType: 'salary' | 'bonus';
  detail: PayrollDetailResponse;
  updatedBy?: string | null;
  updatedAt?: string;
}

export interface PayrollDetailResponse {
  workingDays: number;
  holidayWork: number;
  paidLeave: number;
  paidLeaveRemaining: number;
  paidLeaveRemainingDate: string;
  normalOvertime: number;
  lateNightOvertime: number;
  totalWorkHours: number;
  baseSalary: number;
  overtimeAllowance: number;
  lateNightAllowance: number;
  mealAllowance: number;
  commutingAllowance: number;
  housingAllowance: number;
  allowances: Array<{ name: string; amount: number }>;
  totalEarnings: number;
  socialInsurance: number;
  employeePension: number;
  employmentInsurance: number;
  municipalTax: number;
  incomeTax: number;
  deductions: Array<{ name: string; amount: number }>;
  totalDeductions: number;
  netPay: number;
}

export interface PayrollListResponse {
  payrollId: string;
  year: number;
  month: number;
  statementType: 'salary' | 'bonus';
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  memo?: string | null;
  updatedBy?: string | null;
  updatedAt?: string;
}

/**
 * 給与明細一覧取得
 * @param employeeId 従業員ID
 * @param fiscalYear 年度（オプション）
 * @returns 給与明細一覧
 */
export const getPayrollList = async (
  employeeId: string,
  fiscalYear?: number
): Promise<PayrollListResponse[]> => {
  try {
    const params = new URLSearchParams();
    params.append('employeeId', employeeId);
    if (fiscalYear !== undefined) {
      params.append('fiscalYear', fiscalYear.toString());
    }

    const response = await apiRequest(`/api/v1/payroll?${params.toString()}`, {
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
    return data.data?.records || [];
  } catch (error) {
    logError('Failed to fetch payroll list:', error);
    throw error;
  }
};

/**
 * 給与明細詳細取得
 * @param payrollId 給与明細ID
 * @returns 給与明細詳細
 */
export const getPayrollDetail = async (payrollId: string): Promise<PayrollApiResponse> => {
  try {
    const response = await apiRequest(`/api/v1/payroll/${payrollId}`, {
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
    logError('Failed to fetch payroll detail:', error);
    throw error;
  }
};

/**
 * 給与明細作成
 * @param payload 給与明細作成データ
 */
export const createPayroll = async (payload: {
  employeeId: string;
  year: number;
  month: number;
  statementType: 'salary' | 'bonus';
  detail: PayrollDetailResponse;
}): Promise<void> => {
  try {
    const response = await apiRequest('/api/v1/payroll', {
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
  } catch (error) {
    logError('Failed to create payroll:', error);
    throw error;
  }
};

/**
 * 給与明細更新
 * @param payrollId 給与明細ID
 * @param payload 給与明細更新データ
 */
export const updatePayroll = async (
  payrollId: string,
  payload: {
    employeeId: string;
    year: number;
    month: number;
    statementType: 'salary' | 'bonus';
    detail: PayrollDetailResponse;
  }
): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/payroll/${payrollId}`, {
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
  } catch (error) {
    logError('Failed to update payroll:', error);
    throw error;
  }
};

/**
 * yearとmonthからperiod文字列を生成（UI表示用）
 * @param year 年
 * @param month 月
 * @returns period文字列（例: "2025年 10月"）
 */
export const formatPeriod = (year: number, month: number): string => {
  return `${year}年 ${month}月`;
};

/**
 * period文字列からyearとmonthを抽出
 * @param period period文字列（例: "2025年 10月"）
 * @returns { year: number; month: number } | null
 */
export const parsePeriod = (period: string): { year: number; month: number } | null => {
  const match = period.match(/(\d{4})年\s*(\d{1,2})月/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10)
  };
};

/**
 * PayrollListResponseをPayrollRecord形式に変換（UI用）
 * 注意: この関数は一覧取得APIレスポンス用。詳細情報は含まれない。
 */
export const convertPayrollListResponseToRecord = (
  response: PayrollListResponse,
  employeeName: string,
  companyName: string = '株式会社A・1インテリア'
): {
  id: string;
  year: number;
  month: number;
  type: 'payroll' | 'bonus';
  employeeId: string;
  employeeName: string;
  companyName: string;
  period: string;
  memo?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
} => {
  return {
    id: response.payrollId,
    year: response.year,
    month: response.month,
    type: response.statementType,
    employeeId: '', // 一覧レスポンスには含まれないため、後で設定が必要
    employeeName,
    companyName,
    period: formatPeriod(response.year, response.month),
    memo: response.memo,
    updatedAt: response.updatedAt,
    updatedBy: response.updatedBy,
    totalEarnings: response.totalEarnings,
    totalDeductions: response.totalDeductions,
    netPay: response.netPay
  };
};

/**
 * PayrollApiResponseをPayrollRecord形式に変換（UI用）
 */
export const convertPayrollApiResponseToRecord = (
  response: PayrollApiResponse,
  employeeId: string,
  employeeName: string,
  companyName: string = '株式会社A・1インテリア'
): {
  id: string;
  year: number;
  month: number;
  type: 'payroll' | 'bonus';
  employeeId: string;
  employeeName: string;
  companyName: string;
  period: string;
  memo?: string | null;
  detail: PayrollDetailResponse;
  updatedAt?: string;
  updatedBy?: string | null;
} => {
  return {
    id: response.payrollId,
    year: response.year,
    month: response.month,
    type: response.statementType === 'salary' ? 'payroll' : response.statementType,
    employeeId,
    employeeName,
    companyName,
    period: formatPeriod(response.year, response.month),
    memo: undefined, // 詳細レスポンスには含まれない場合がある
    detail: response.detail,
    updatedAt: response.updatedAt,
    updatedBy: response.updatedBy
  };
};

