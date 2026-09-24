/**
 * 出勤簿の「勤怠を追加」「勤怠の編集」フォーム（休憩行）のテスト。
 */
import { describe, it, expect } from 'vitest';
import { filledBreaks, validateBreaks, toBreakRequests } from './attendanceEntryForm';

describe('filledBreaks', () => {
  it('開始・終了とも空の行を除外する', () => {
    expect(
      filledBreaks([
        { start: '12:00', end: '13:00' },
        { start: '', end: '' },
        { start: '15:00', end: '' }
      ])
    ).toEqual([
      { start: '12:00', end: '13:00' },
      { start: '15:00', end: '' }
    ]);
  });
});

describe('validateBreaks', () => {
  it('正しい休憩・空行・終了未入力（休憩中）は OK', () => {
    expect(validateBreaks([])).toBeNull();
    expect(validateBreaks([{ start: '12:00', end: '13:00' }, { start: '', end: '' }])).toBeNull();
    expect(validateBreaks([{ start: '15:00', end: '' }])).toBeNull();
  });

  it('終了だけ入力された行はエラー（入力済み行の番号で案内）', () => {
    expect(validateBreaks([{ start: '', end: '' }, { start: '', end: '13:00' }])).toBe(
      '休憩1の開始時刻を入力してください'
    );
  });

  it('終了が開始以前ならエラー', () => {
    expect(validateBreaks([{ start: '12:00', end: '13:00' }, { start: '15:00', end: '14:30' }])).toBe(
      '休憩2の終了時刻は開始時刻より後にしてください'
    );
    expect(validateBreaks([{ start: '12:00', end: '12:00' }])).toBe(
      '休憩1の終了時刻は開始時刻より後にしてください'
    );
  });
});

describe('toBreakRequests', () => {
  it('勤務日付きの JST 日時に変換し、空行は送らない', () => {
    expect(
      toBreakRequests(
        [
          { start: '12:00', end: '13:00' },
          { start: '', end: '' },
          { start: '15:00', end: '' }
        ],
        '2026-09-05'
      )
    ).toEqual([
      { start: '2026-09-05 12:00:00', end: '2026-09-05 13:00:00' },
      { start: '2026-09-05 15:00:00', end: null }
    ]);
  });
});
