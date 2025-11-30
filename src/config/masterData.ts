/**
 * マスタデータの型定義と読み込みユーティリティ。
 */

import masterDataJson from './masterData.json';

/**
 * 雇用形態を表すインターフェース。
 */
export interface EmploymentType {
  /** 雇用形態コード。 */
  code: string;
  /** 雇用形態ラベル。 */
  label: string;
}

/**
 * 申請ステータスを表すインターフェース。
 */
export interface RequestStatus {
  /** ステータスコード。 */
  code: string;
  /** ステータスラベル。 */
  label: string;
  /** 背景色。 */
  backgroundColor: string;
  /** 文字色。 */
  color: string;
}

/**
 * 休暇種別を表すインターフェース。
 */
export interface LeaveType {
  /** 休暇種別コード。 */
  code: string;
  /** 休暇種別ラベル。 */
  label: string;
}

/**
 * 申請種別を表すインターフェース。
 */
export interface RequestType {
  /** 申請種別コード。 */
  code: string;
  /** 申請種別ラベル。 */
  label: string;
}

/**
 * 勤怠ステータスを表すインターフェース。
 */
export interface AttendanceStatus {
  /** ステータスコード。 */
  code: string;
  /** ステータスラベル。 */
  label: string;
  /** 背景色。 */
  backgroundColor: string;
  /** 文字色。 */
  color: string;
}

/**
 * マスタデータ全体を表すインターフェース。
 */
export interface MasterData {
  /** 雇用形態の配列。 */
  employmentTypes: EmploymentType[];
  /** 申請ステータスの配列。 */
  requestStatuses: RequestStatus[];
  /** 休暇種別の配列。 */
  leaveTypes: LeaveType[];
  /** 申請種別の配列。 */
  requestTypes: RequestType[];
  /** 勤怠ステータスの配列。 */
  attendanceStatuses: AttendanceStatus[];
}

/**
 * マスタデータを型安全に読み込んだオブジェクト。
 */
export const masterData: MasterData = masterDataJson as MasterData;

/**
 * 雇用形態の一覧を取得します。
 *
 * @returns {EmploymentType[]} 雇用形態の配列。
 */
export const getEmploymentTypes = (): EmploymentType[] => masterData.employmentTypes;

/**
 * 申請ステータスの一覧を取得します。
 *
 * @returns {RequestStatus[]} 申請ステータスの配列。
 */
export const getRequestStatuses = (): RequestStatus[] => masterData.requestStatuses;

/**
 * 休暇種別の一覧を取得します。
 *
 * @returns {LeaveType[]} 休暇種別の配列。
 */
export const getLeaveTypes = (): LeaveType[] => masterData.leaveTypes;

/**
 * 申請種別の一覧を取得します。
 *
 * @returns {RequestType[]} 申請種別の配列。
 */
export const getRequestTypes = (): RequestType[] => masterData.requestTypes;

/**
 * 勤怠ステータスの一覧を取得します。
 *
 * @returns {AttendanceStatus[]} 勤怠ステータスの配列。
 */
export const getAttendanceStatuses = (): AttendanceStatus[] => masterData.attendanceStatuses;

/**
 * 雇用形態コードからラベルを取得します。
 *
 * @param {string} code - 雇用形態コード。
 * @returns {string} 雇用形態ラベル。該当するコードがない場合はコード自体を返します。
 */
export const getEmploymentTypeLabel = (code: string): string => {
  const type = masterData.employmentTypes.find(t => t.code === code);
  return type?.label || code;
};

/**
 * 申請ステータスコードからラベルを取得します。
 *
 * @param {string} code - 申請ステータスコード。
 * @returns {string} 申請ステータスラベル。該当するコードがない場合はコード自体を返します。
 */
export const getRequestStatusLabel = (code: string): string => {
  const status = masterData.requestStatuses.find(s => s.code === code);
  return status?.label || code;
};

/**
 * 申請ステータスコードからスタイル（背景色と文字色）を取得します。
 *
 * @param {string} code - 申請ステータスコード。
 * @returns {{ backgroundColor: string; color: string }} スタイルオブジェクト。該当するコードがない場合はデフォルトスタイルを返します。
 */
export const getRequestStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const status = masterData.requestStatuses.find(s => s.code === code);
  return status ? { backgroundColor: status.backgroundColor, color: status.color } : { backgroundColor: '#e5e7eb', color: '#6b7280' };
};

/**
 * 休暇種別コードからラベルを取得します。
 *
 * @param {string} code - 休暇種別コード。
 * @returns {string} 休暇種別ラベル。該当するコードがない場合はコード自体を返します。
 */
export const getLeaveTypeLabel = (code: string): string => {
  const type = masterData.leaveTypes.find(t => t.code === code);
  return type?.label || code;
};

/**
 * 申請種別コードからラベルを取得します。
 *
 * @param {string} code - 申請種別コード。
 * @returns {string} 申請種別ラベル。該当するコードがない場合はコード自体を返します。
 */
export const getRequestTypeLabel = (code: string): string => {
  const type = masterData.requestTypes.find(t => t.code === code);
  return type?.label || code;
};

/**
 * 勤怠ステータスコードからラベルを取得します。
 *
 * @param {string} code - 勤怠ステータスコード。
 * @returns {string} 勤怠ステータスラベル。該当するコードがない場合はコード自体を返します。
 */
export const getAttendanceStatusLabel = (code: string): string => {
  const status = masterData.attendanceStatuses.find(s => s.code === code);
  return status?.label || code;
};

/**
 * 勤怠ステータスコードからスタイル（背景色と文字色）を取得します。
 *
 * @param {string} code - 勤怠ステータスコード。
 * @returns {{ backgroundColor: string; color: string }} スタイルオブジェクト。該当するコードがない場合はデフォルトスタイルを返します。
 */
export const getAttendanceStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const status = masterData.attendanceStatuses.find(s => s.code === code);
  return status ? { backgroundColor: status.backgroundColor, color: status.color } : { backgroundColor: '#e5e7eb', color: '#374151' };
};

