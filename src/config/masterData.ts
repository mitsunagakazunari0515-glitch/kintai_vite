/**
 * マスタデータの型定義と読み込みユーティリティ
 */

import masterDataJson from './masterData.json';

export interface EmploymentType {
  code: string;
  label: string;
}

export interface RequestStatus {
  code: string;
  label: string;
  backgroundColor: string;
  color: string;
}

export interface LeaveType {
  code: string;
  label: string;
}

export interface RequestType {
  code: string;
  label: string;
}

export interface AttendanceStatus {
  code: string;
  label: string;
  backgroundColor: string;
  color: string;
}

export interface MasterData {
  employmentTypes: EmploymentType[];
  requestStatuses: RequestStatus[];
  leaveTypes: LeaveType[];
  requestTypes: RequestType[];
  attendanceStatuses: AttendanceStatus[];
}

// マスタデータを型安全に読み込む
export const masterData: MasterData = masterDataJson as MasterData;

// ユーティリティ関数
export const getEmploymentTypes = (): EmploymentType[] => masterData.employmentTypes;
export const getRequestStatuses = (): RequestStatus[] => masterData.requestStatuses;
export const getLeaveTypes = (): LeaveType[] => masterData.leaveTypes;
export const getRequestTypes = (): RequestType[] => masterData.requestTypes;
export const getAttendanceStatuses = (): AttendanceStatus[] => masterData.attendanceStatuses;

// コードからラベルを取得
export const getEmploymentTypeLabel = (code: string): string => {
  const type = masterData.employmentTypes.find(t => t.code === code);
  return type?.label || code;
};

export const getRequestStatusLabel = (code: string): string => {
  const status = masterData.requestStatuses.find(s => s.code === code);
  return status?.label || code;
};

export const getRequestStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const status = masterData.requestStatuses.find(s => s.code === code);
  return status ? { backgroundColor: status.backgroundColor, color: status.color } : { backgroundColor: '#e5e7eb', color: '#6b7280' };
};

export const getLeaveTypeLabel = (code: string): string => {
  const type = masterData.leaveTypes.find(t => t.code === code);
  return type?.label || code;
};

export const getRequestTypeLabel = (code: string): string => {
  const type = masterData.requestTypes.find(t => t.code === code);
  return type?.label || code;
};

export const getAttendanceStatusLabel = (code: string): string => {
  const status = masterData.attendanceStatuses.find(s => s.code === code);
  return status?.label || code;
};

export const getAttendanceStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const status = masterData.attendanceStatuses.find(s => s.code === code);
  return status ? { backgroundColor: status.backgroundColor, color: status.color } : { backgroundColor: '#e5e7eb', color: '#374151' };
};

