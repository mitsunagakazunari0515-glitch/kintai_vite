/**
 * 出勤簿（管理者）の「勤怠を追加」「勤怠の編集」モーダルで使うフォームの純粋関数群。
 * 休憩行の入力チェックと、API（PUT /api/v1/attendance）の breaks 形式への変換を担う。
 */
import { formatJSTDateTime } from './formatters';
import type { BreakRequest } from './attendanceApi';

/**
 * モーダル内の休憩1行（HH:mm。未入力は空文字）。
 */
export interface BreakInput {
  /** 休憩開始時刻（HH:mm）。 */
  start: string;
  /** 休憩終了時刻（HH:mm）。未入力は空文字。 */
  end: string;
}

/**
 * 開始・終了とも空の行を取り除いた、入力済みの休憩行だけを返す。
 *
 * @param {BreakInput[]} breaks - モーダルの休憩行。
 * @returns {BreakInput[]} 開始または終了のどちらかが入力されている行。
 */
export const filledBreaks = (breaks: BreakInput[]): BreakInput[] =>
  breaks.filter(b => b.start.trim() !== '' || b.end.trim() !== '');

/**
 * 休憩行の入力チェック。問題があれば利用者向けのメッセージを返す。
 * 開始・終了とも空の行は無視する（「＋ 休憩を追加」で増やしたまま未入力の行を許容するため）。
 *
 * @param {BreakInput[]} breaks - モーダルの休憩行。
 * @returns {string | null} エラーメッセージ。問題なければ null。
 */
export const validateBreaks = (breaks: BreakInput[]): string | null => {
  for (const [i, b] of filledBreaks(breaks).entries()) {
    const no = i + 1;
    if (!b.start) return `休憩${no}の開始時刻を入力してください`;
    if (b.end && b.end <= b.start) return `休憩${no}の終了時刻は開始時刻より後にしてください`;
  }
  return null;
};

/**
 * 休憩行を API の breaks 形式（YYYY-MM-DD HH:MM:SS）に変換する。空行は除外する。
 *
 * @param {BreakInput[]} breaks - モーダルの休憩行（validateBreaks 済みを想定）。
 * @param {string} workDate - 勤務日（YYYY-MM-DD）。
 * @returns {BreakRequest[]} API に送る休憩の配列。
 */
export const toBreakRequests = (breaks: BreakInput[], workDate: string): BreakRequest[] =>
  filledBreaks(breaks).map(b => ({
    start: formatJSTDateTime(workDate, b.start),
    end: b.end ? formatJSTDateTime(workDate, b.end) : null
  }));
