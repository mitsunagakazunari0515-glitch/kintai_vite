/**
 * 従業員APIのユーティリティ関数
 * 従業員の登録、更新、取得などのAPI呼び出しを提供します。
 */

import { apiRequest } from '../config/apiConfig';
import { error as logError, warn } from './logger';
import { extractApiError, translateApiError } from './apiErrorTranslator';

/**
 * 従業員データのレスポンス型
 * firstName: 苗字（姓）
 * lastName: 名前（名）
 */
export interface EmployeeResponse {
  id: string;
  firstName: string;  // 苗字（姓）
  lastName: string;   // 名前（名）
  employmentType: 'FULL_TIME' | 'PART_TIME';
  email: string;
  joinDate: string;
  leaveDate: string | null;
  allowances: string[];
  isAdmin: boolean;
  baseSalary: number;
  defaultBreakTime: number;
  prescribedWorkHours?: number;
  workLocationId?: string | null;
  paidLeaves: Array<{
    grantDate: string;
    days: number;
  }>;
  updatedBy?: string;
  updatedAt?: string;
  createdAt?: string;
}

/**
 * 従業員登録リクエストボディ
 */
export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  employmentType: 'FULL_TIME' | 'PART_TIME';
  email: string;
  joinDate: string;
  leaveDate?: string | null;
  allowances?: string[];
  isAdmin?: boolean;
  baseSalary: number;
  defaultBreakTime: number;
  prescribedWorkHours?: number;
  workLocationId?: string | null;
  paidLeaves?: Array<{
    grantDate: string;
    days: number;
  }>;
}

/**
 * 従業員更新リクエストボディ（登録と同じ構造）
 */
export type UpdateEmployeeRequest = CreateEmployeeRequest;

/**
 * 従業員登録
 * @param payload 従業員登録データ
 */
export const createEmployee = async (payload: CreateEmployeeRequest): Promise<void> => {
  try {
    const response = await apiRequest('/api/v1/employees/register', {
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

    // 登録APIはdataフィールドを含まない（statusCodeとmessageのみ）
    await response.json();
  } catch (error) {
    logError('Failed to create employee:', error);
    throw error;
  }
};

/**
 * 従業員更新
 * @param employeeId 従業員ID
 * @param payload 従業員更新データ
 */
export const updateEmployee = async (
  employeeId: string,
  payload: UpdateEmployeeRequest
): Promise<void> => {
  try {
    const response = await apiRequest(`/api/v1/employees/${employeeId}`, {
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

    // 更新APIはdataフィールドを含まない（statusCodeとmessageのみ）
    await response.json();
  } catch (error) {
    logError('Failed to update employee:', error);
    throw error;
  }
};

/**
 * 従業員一覧取得
 * @returns 従業員一覧
 */
export const getEmployees = async (): Promise<EmployeeResponse[]> => {
  try {
    const response = await apiRequest('/api/v1/employees', {
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
    
    // レスポンス構造の確認と処理
    // パターン1: { statusCode: 200, message: "success", data: { employees: [...], total: 1 } }
    // パターン2: { data: { employees: [...] } }
    // パターン3: { employees: [...] }
    let employees: EmployeeResponse[] = [];
    
    if (data.data && data.data.employees && Array.isArray(data.data.employees)) {
      // パターン1またはパターン2: { statusCode: 200, message: "success", data: { employees: [...], total: 1 } }
      employees = data.data.employees;
    } else if (data.employees && Array.isArray(data.employees)) {
      // パターン3: { employees: [...] }
      employees = data.employees;
    } else if (Array.isArray(data)) {
      // 配列が直接返される場合
      employees = data;
    } else {
      logError('getEmployees: Unexpected response structure:', data);
      employees = [];
    }
    
    if (employees.length === 0) {
      warn('getEmployees: No employees found in response!');
    }
    return employees;
  } catch (error) {
    logError('Failed to fetch employees:', error);
    throw error;
  }
};

/**
 * 従業員詳細取得
 * @param employeeId 従業員ID
 * @returns 従業員詳細
 */
export const getEmployee = async (employeeId: string): Promise<EmployeeResponse> => {
  try {
    const response = await apiRequest(`/api/v1/employees/${employeeId}`, {
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
    logError('Failed to fetch employee:', error);
    throw error;
  }
};

