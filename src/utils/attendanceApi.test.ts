/**
 * attendanceApi の純粋ヘルパーのユニットテスト。
 *
 * 対象: isHolidayWorkLog（休日出勤日数の集計判定）
 * 設計書: attendance-workspace/docs/backend/BUSINESS_LOGIC_GUIDE.md（休日/平日区分と残業計算）、
 *         attendance-workspace/docs/frontend/UI_SPECIFICATION.md（給与画面の休日出勤日数）
 *
 * 背景: 以前フロントは休日出勤日数を曜日（getDay）で独自判定しており、バックエンドの残業計算と
 * 二重実装になっていた。バックエンドが返す isHolidayWork（dayTypeOverride 反映済み）を優先することで
 * この二重判定を解消した。本テストはその判定ロジックを固定する。
 */
import { describe, it, expect } from 'vitest';
import { isHolidayWorkLog } from './attendanceApi';

// 2024-05-11 は土曜、2024-05-13 は月曜
const SATURDAY = '2024-05-11';
const MONDAY = '2024-05-13';

const baseLog = {
  clockIn: '09:00',
  clockOut: '18:00',
};

describe('isHolidayWorkLog', () => {
  it('出勤または退勤が無い日はカウントしない', () => {
    expect(isHolidayWorkLog({ ...baseLog, clockOut: null, workDate: SATURDAY, isHolidayWork: true })).toBe(false);
    expect(isHolidayWorkLog({ ...baseLog, clockIn: null, workDate: SATURDAY, isHolidayWork: true })).toBe(false);
  });

  it('バックエンドの isHolidayWork を最優先する（土曜でも false ならカウントしない）', () => {
    // 土曜だが weekday 扱い（通常出勤）→ isHolidayWork=false
    expect(isHolidayWorkLog({ ...baseLog, workDate: SATURDAY, isHolidayWork: false })).toBe(false);
    // 月曜だが holiday 扱い → isHolidayWork=true
    expect(isHolidayWorkLog({ ...baseLog, workDate: MONDAY, isHolidayWork: true })).toBe(true);
  });

  it('isHolidayWork が無い場合は曜日で判定（後方互換）', () => {
    expect(isHolidayWorkLog({ ...baseLog, workDate: SATURDAY, isHolidayWork: undefined })).toBe(true);
    expect(isHolidayWorkLog({ ...baseLog, workDate: MONDAY, isHolidayWork: undefined })).toBe(false);
  });

  it('複数ログの休日出勤日数を正しく数えられる（土曜の通常出勤は除外される）', () => {
    const logs = [
      { ...baseLog, workDate: SATURDAY, isHolidayWork: true },   // 休日出勤 → カウント
      { ...baseLog, workDate: SATURDAY, isHolidayWork: false },  // 通常出勤（weekday扱い）→ 除外
      { ...baseLog, workDate: MONDAY, isHolidayWork: false },    // 平日 → 除外
      { ...baseLog, workDate: MONDAY, isHolidayWork: true },     // 休日扱い → カウント
      { ...baseLog, clockOut: null, workDate: SATURDAY, isHolidayWork: true }, // 退勤なし → 除外
    ];
    expect(logs.filter(isHolidayWorkLog).length).toBe(2);
  });
});
