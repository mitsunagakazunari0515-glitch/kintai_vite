/**
 * APIコード変換ユーティリティ
 * APIから返される英語コードを日本語に変換します
 * 添付資料「API_CODE_LIST.md」に基づく実装
 */

/**
 * 勤怠ステータスコードを日本語に変換
 * @param code 勤怠ステータスコード（not_started, working, on_break, completed）
 * @returns 日本語表示ラベル
 */
export const getAttendanceStatusLabel = (code: string): string => {
  const statusMap: Record<string, string> = {
    'not_started': '未出勤',
    'working': '出勤中',
    'on_break': '休憩中',
    'completed': '退勤済み'
  };
  return statusMap[code] || code;
};

/**
 * 勤怠ステータスコードからスタイルを取得
 * @param code 勤怠ステータスコード
 * @returns スタイルオブジェクト（背景色と文字色）
 */
export const getAttendanceStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const styleMap: Record<string, { backgroundColor: string; color: string }> = {
    'not_started': { backgroundColor: '#e5e7eb', color: '#374151' }, // グレー
    'working': { backgroundColor: '#dbeafe', color: '#1e40af' }, // ブルー
    'on_break': { backgroundColor: '#fef3c7', color: '#92400e' }, // ダークイエロー
    'completed': { backgroundColor: '#d1fae5', color: '#065f46' } // グリーン
  };
  return styleMap[code] || { backgroundColor: '#e5e7eb', color: '#6b7280' };
};

/**
 * 休暇申請ステータスコードを日本語に変換
 * @param code 休暇申請ステータスコード（pending, approved, rejected, deleted）
 * @returns 日本語表示ラベル
 */
export const getLeaveRequestStatusLabel = (code: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '申請中',
    'approved': '承認',
    'rejected': '取消',
    'deleted': '削除済み'
  };
  return statusMap[code] || code;
};

/**
 * 休暇申請ステータスコードからスタイルを取得
 * @param code 休暇申請ステータスコード
 * @returns スタイルオブジェクト（背景色と文字色）
 */
export const getLeaveRequestStatusStyle = (code: string): { backgroundColor: string; color: string } => {
  const styleMap: Record<string, { backgroundColor: string; color: string }> = {
    'pending': { backgroundColor: '#fef3c7', color: '#92400e' }, // イエロー
    'approved': { backgroundColor: '#d1fae5', color: '#065f46' }, // グリーン
    'rejected': { backgroundColor: '#fee2e2', color: '#991b1b' }, // レッド
    'deleted': { backgroundColor: '#e5e7eb', color: '#6b7280' } // グレー
  };
  return styleMap[code] || { backgroundColor: '#e5e7eb', color: '#6b7280' };
};

/**
 * 休暇種別コードを日本語に変換
 * @param code 休暇種別コード（paid, special, sick, absence, other）
 * @returns 日本語表示ラベル
 */
export const getLeaveTypeLabel = (code: string): string => {
  const typeMap: Record<string, string> = {
    'paid': '有給',
    'special': '特別休暇',
    'sick': '病気休暇',
    'absence': '欠勤',
    'other': 'その他'
  };
  return typeMap[code] || code;
};

/**
 * 給与明細種別コードを日本語に変換
 * @param code 給与明細種別コード（salary, bonus）
 * @returns 日本語表示ラベル
 */
export const getStatementTypeLabel = (code: string): string => {
  const typeMap: Record<string, string> = {
    'salary': '給与明細',
    'bonus': '賞与明細'
  };
  return typeMap[code] || code;
};

/**
 * 雇用形態コードを日本語に変換
 * @param code 雇用形態コード（FULL_TIME, PART_TIME）
 * @returns 日本語表示ラベル
 */
export const getEmploymentTypeLabel = (code: string): string => {
  const typeMap: Record<string, string> = {
    'FULL_TIME': '正社員',
    'PART_TIME': 'パートタイム'
  };
  return typeMap[code] || code;
};

/**
 * エラーコードを日本語に変換
 * @param code エラーコード（VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_SERVER_ERROR）
 * @returns 日本語表示ラベル
 */
export const getErrorCodeLabel = (code: string): string => {
  const errorMap: Record<string, string> = {
    'VALIDATION_ERROR': 'バリデーションエラー',
    'UNAUTHORIZED': '認証エラー',
    'FORBIDDEN': '権限エラー',
    'NOT_FOUND': 'リソース未検出',
    'CONFLICT': '競合エラー',
    'INTERNAL_SERVER_ERROR': '内部サーバーエラー'
  };
  return errorMap[code] || code;
};

/**
 * 休暇種別の日本語ラベルを英語コードに変換（APIリクエスト用）
 * @param label 日本語ラベル（有給, 特別休暇, 病気休暇, 欠勤, その他）
 * @returns 英語コード（paid, special, sick, absence, other）
 */
export const getLeaveTypeCodeFromLabel = (label: string): string => {
  const labelMap: Record<string, string> = {
    '有給': 'paid',
    '特別休暇': 'special',
    '病気休暇': 'sick',
    '欠勤': 'absence',
    'その他': 'other'
  };
  return labelMap[label] || label;
};

