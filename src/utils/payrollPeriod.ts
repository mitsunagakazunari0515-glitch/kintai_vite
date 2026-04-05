/**
 * 給与・出勤簿で共通する「前月26日〜当月25日」の期間ユーティリティ。
 * 表示上の「○年○月」は締め日が当月25日となる月（給与計算の対象月）。
 */

import type { AttendanceLog, AttendanceSummary, DailyLaborRow } from './attendanceApi';

/** 前月26日〜当月25日の開始・終了を YYYY-MM-DD で返す */
export function getPayrollPeriodBounds(year: number, month: number): { startDate: string; endDate: string } {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return {
    startDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-26`,
    endDate: `${year}-${String(month).padStart(2, '0')}-25`
  };
}

/**
 * 指定日が属する給与期間の「締め月」（○年○月）を返す。
 * 26日以降は翌月締めの期間に入る。
 */
export function getPayrollClosingYearMonthFromDate(d: Date = new Date()): { year: number; month: number } {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (day >= 26) {
    if (m === 12) return { year: y + 1, month: 1 };
    return { year: y, month: m + 1 };
  }
  return { year: y, month: m };
}

/** 期間内の全日付を昇順で列挙 */
export function enumeratePayrollPeriodDates(year: number, month: number): string[] {
  const { startDate, endDate } = getPayrollPeriodBounds(year, month);
  const dates: string[] = [];
  const cur = parseYmd(startDate);
  const end = parseYmd(endDate);
  while (cur <= end) {
    dates.push(formatYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 開始日〜終了日（含む）の平日（月〜金）の日数 */
export function countWeekdaysBetweenInclusive(startDate: string, endDate: string): number {
  const cur = parseYmd(startDate);
  const end = parseYmd(endDate);
  let n = 0;
  while (cur <= end) {
    const w = cur.getDay();
    if (w !== 0 && w !== 6) n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

export function isDateInPayrollPeriod(ymd: string, year: number, month: number): boolean {
  const { startDate, endDate } = getPayrollPeriodBounds(year, month);
  return ymd >= startDate && ymd <= endDate;
}

/** 給与期間のログから日数系を算出（出勤簿テーブル・小計と同じ期間） */
export interface PayrollPeriodDayStats {
  prescribedWorkingDays: number;
  workingDays: number;
  weekdayWorkDays: number;
  holidayWorkingDays: number;
}

export function computePayrollPeriodDayStats(
  logs: Array<{ date: string; clockIn?: string | null; clockOut?: string | null }>,
  startDate: string,
  endDate: string
): PayrollPeriodDayStats {
  const periodLogs = logs.filter(l => l.date >= startDate && l.date <= endDate);
  const workingDays = periodLogs.filter(log => log.clockIn && log.clockOut).length;
  const weekdayWorkDays = periodLogs.filter(log => {
    if (!log.clockIn || !log.clockOut) return false;
    const dayOfWeek = new Date(log.date).getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }).length;
  const holidayWorkingDays = periodLogs.filter(log => {
    if (!log.clockIn || !log.clockOut) return false;
    const dayOfWeek = new Date(log.date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }).length;
  const prescribedWorkingDays = countWeekdaysBetweenInclusive(startDate, endDate);
  return {
    prescribedWorkingDays,
    workingDays,
    weekdayWorkDays,
    holidayWorkingDays
  };
}

/** 表示用: 「2025年9月26日 〜 2025年10月25日」 */
export function formatPayrollPeriodRangeJapanese(year: number, month: number): string {
  const { startDate, endDate } = getPayrollPeriodBounds(year, month);
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  return `${sy}年${sm}月${sd}日 〜 ${ey}年${em}月${ed}日`;
}

/** 平日1日あたりの規定労働時間（7:30）を分で表した値 */
export const PRESCRIBED_WORK_MINUTES_PER_WEEKDAY = 7 * 60 + 30;

/**
 * 所定労働日数（期間内の平日数）× 7:30 の規定稼働時間（分）
 */
export function prescribedWorkingMinutesFromScheduledWeekdays(scheduledWeekdays: number): number {
  const n = Number(scheduledWeekdays);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n) * PRESCRIBED_WORK_MINUTES_PER_WEEKDAY;
}

/**
 * GET /api/v1/attendance/my-records の `summary` をベースに、フロント表示用の内訳だけ付与する。
 * - 画面上の**労働時間・日数の本表**は `sumAttendanceTableColumnTotals` / `computePayrollPeriodDayStats` で
 *   給与期間に揃える。ここでは任意で `dailyLabor` 期間内訳を付与する（未使用でも可）。
 */
export function mergePayrollPeriodSummary(
  baseSummary: AttendanceSummary,
  _periodLogs: AttendanceLog[],
  startDate: string,
  endDate: string,
  dailyLabor?: DailyLaborRow[] | null
): AttendanceSummary {
  const periodDaily = (dailyLabor ?? []).filter(
    d => d.workDate >= startDate && d.workDate <= endDate
  );

  if (periodDaily.length > 0) {
    const paidLeaveConvertedMinutes = periodDaily.reduce((s, d) => s + (d.paidLeaveMinutes ?? 0), 0);
    const timeRecordOnlyMinutes = periodDaily.reduce((s, d) => s + (d.timeRecordMinutes ?? 0), 0);

    return {
      ...baseSummary,
      paidLeaveConvertedMinutes,
      timeRecordOnlyMinutes
    };
  }

  return {
    ...baseSummary,
    paidLeaveConvertedMinutes: undefined,
    timeRecordOnlyMinutes: undefined
  };
}
