/**
 * ダミーデータの読み込みとエクスポート
 * APIの項目をイメージして作成
 */

import { log } from '../../utils/logger';
import employeesData from './employees.json';
import allowancesData from './allowances.json';
import deductionsData from './deductions.json';
import leaveRequestsData from './leaveRequests.json';
import attendanceCorrectionRequestsData from './attendanceCorrectionRequests.json';
import attendanceLogsData from './attendanceLogs.json';
import employeeLeaveRequestsData from './employeeLeaveRequests.json';
import employeeAttendanceLogsData from './employeeAttendanceLogs.json';
import payrollRecordsData from './payrollRecords.json';

// 型定義
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employmentType: string;
  email: string;
  joinDate: string;
  leaveDate: string | null;
  allowances: string[];
  isAdmin: boolean;
  baseSalary: number;
  defaultBreakTime: number;
  paidLeaves: Array<{
    grantDate: string;
    days: number;
  }>;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface Allowance {
  id: string;
  name: string;
  color: string;
  includeInOvertime: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Deduction {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  days: number;
  type: string;
  reason: string;
  status: string;
  isHalfDay: boolean;
  requestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  requestedClockIn: string;
  requestedClockOut: string | null;
  requestedBreaks: Array<{ start: string; end: string | null }>;
  reason: string;
  status: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLog {
  id: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: Array<{ start: string; end: string | null }>;
  status: string;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  companyName: string;
  period: string;
  detail: {
    workingDays: number;
    holidayWork: number;
    paidLeave: number;
    paidLeaveRemaining: number;
    paidLeaveRemainingDate: string;
    normalOvertime: number;
    lateNightOvertime: number;
    baseSalary: number;
    overtimeAllowance: number;
    lateNightAllowance: number;
    mealAllowance: number;
    allowances?: { [key: string]: number };
    totalEarnings: number;
    deductions?: { [key: string]: number };
    totalDeductions: number;
    netPay: number;
  };
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// データのエクスポート
export const dummyEmployees: Employee[] = employeesData.employees;
export const dummyAllowances: Allowance[] = allowancesData.allowances;
export const dummyDeductions: Deduction[] = deductionsData.deductions;
export const dummyLeaveRequests: LeaveRequest[] = leaveRequestsData.leaveRequests;
export const dummyAttendanceCorrectionRequests: AttendanceCorrectionRequest[] = attendanceCorrectionRequestsData.attendanceCorrectionRequests;
export const dummyAttendanceLogs: AttendanceLog[] = attendanceLogsData.attendanceLogs;
export const dummyEmployeeLeaveRequests: LeaveRequest[] = employeeLeaveRequestsData.employeeLeaveRequests;
export const dummyEmployeeAttendanceLogs: AttendanceLog[] = employeeAttendanceLogsData.employeeAttendanceLogs;
export const dummyPayrollRecords: PayrollRecord[] = payrollRecordsData.payrollRecords;

// ユーティリティ関数
export const getEmployeeById = (id: string): Employee | undefined => {
  return dummyEmployees.find(emp => emp.id === id);
};

export const getLeaveRequestsByEmployeeId = (employeeId: string): LeaveRequest[] => {
  return dummyEmployeeLeaveRequests.filter(req => req.employeeId === employeeId);
};

export const getAttendanceLogsByEmployeeId = (employeeId: string): AttendanceLog[] => {
  return dummyEmployeeAttendanceLogs.filter(log => log.employeeId === employeeId);
};

export const getPayrollRecordsByEmployeeId = (employeeId: string): PayrollRecord[] => {
  const result = dummyPayrollRecords.filter(record => record.employeeId === employeeId);
  log(`[getPayrollRecordsByEmployeeId] employeeId=${employeeId}, total records=${dummyPayrollRecords.length}, filtered=${result.length}`);
  log(`[getPayrollRecordsByEmployeeId] All records:`, dummyPayrollRecords.map(r => ({ employeeId: r.employeeId, period: r.period, employeeName: r.employeeName })));
  log(`[getPayrollRecordsByEmployeeId] Filtered records:`, result.map(r => ({ employeeId: r.employeeId, period: r.period, employeeName: r.employeeName })));
  return result;
};



