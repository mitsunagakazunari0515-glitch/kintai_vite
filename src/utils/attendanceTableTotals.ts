/**
 * 出勤簿テーブル（給与期間：前月26〜当月25）の列小計用集計。
 * 各行の表示ロジック（dailyLabor 優先、なければログの totalWorkMinutes 等）と整合させる。
 */

import { parseJSTDateTime } from './formatters';
import type { DailyLaborRow } from './attendanceApi';

export type LogLikeForTableTotals = {
  totalWorkMinutes?: number | null;
  overtimeMinutes?: number | null;
  lateNightMinutes?: number | null;
  breaks?: Array<{
    start?: string;
    end?: string | null;
    startIso?: string | null;
    endIso?: string | null;
  }>;
};

export interface AttendanceTableColumnTotals {
  stampMinutes: number;
  paidLeaveMinutes: number;
  laborMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  breakMinutes: number;
}

function sumBreakMinutesFromLog(log: LogLikeForTableTotals): number {
  if (!log.breaks?.length) return 0;
  let breakMinutes = 0;
  for (const breakItem of log.breaks) {
    if (breakItem.startIso && breakItem.endIso) {
      try {
        const startDate = parseJSTDateTime(breakItem.startIso);
        const endDate = parseJSTDateTime(breakItem.endIso);
        if (startDate && endDate) {
          const diffMs = endDate.getTime() - startDate.getTime();
          breakMinutes += Math.max(0, Math.floor(diffMs / (1000 * 60)));
        }
      } catch {
        if (breakItem.start && breakItem.end) {
          const [bStartHour, bStartMinute] = breakItem.start.split(':').map(Number);
          const [bEndHour, bEndMinute] = breakItem.end.split(':').map(Number);
          const bStartM = bStartHour * 60 + bStartMinute;
          const bEndM = bEndHour * 60 + bEndMinute;
          breakMinutes += Math.max(0, bEndM - bStartM);
        }
      }
    }
  }
  return breakMinutes;
}

/**
 * 期間内の全日について、出勤簿テーブル各列の分合計を返す。
 */
export function sumAttendanceTableColumnTotals(
  periodDates: string[],
  dailyLaborByDate: Record<string, DailyLaborRow>,
  getLog: (date: string) => LogLikeForTableTotals | undefined
): AttendanceTableColumnTotals {
  let stampMinutes = 0;
  let paidLeaveMinutes = 0;
  let laborMinutes = 0;
  let overtimeMinutes = 0;
  let lateNightMinutes = 0;
  let breakMinutes = 0;

  for (const date of periodDates) {
    const log = getLog(date);
    const dl = dailyLaborByDate[date];
    if (dl) {
      stampMinutes += dl.timeRecordMinutes ?? 0;
      paidLeaveMinutes += dl.paidLeaveMinutes ?? 0;
      laborMinutes += dl.laborMinutes ?? 0;
    } else if (log != null && log.totalWorkMinutes != null) {
      stampMinutes += log.totalWorkMinutes;
      laborMinutes += log.totalWorkMinutes;
    }
    if (log) {
      overtimeMinutes += log.overtimeMinutes ?? 0;
      lateNightMinutes += log.lateNightMinutes ?? 0;
      breakMinutes += sumBreakMinutesFromLog(log);
    }
  }

  return {
    stampMinutes,
    paidLeaveMinutes,
    laborMinutes,
    overtimeMinutes,
    lateNightMinutes,
    breakMinutes
  };
}
