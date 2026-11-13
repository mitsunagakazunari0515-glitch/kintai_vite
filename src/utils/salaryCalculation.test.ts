import { describe, it, expect } from 'vitest';
import {
  AVERAGE_MONTHLY_WORKING_DAYS,
  STANDARD_WORK_HOURS_PER_DAY,
  calculateDailySalary,
  calculateHourlySalary,
  calculateOvertimeHourlyRate,
} from './salaryCalculation';

describe('salaryCalculation', () => {
  it('月平均稼働日数は 21.3、所定労働時間は 7.5', () => {
    expect(AVERAGE_MONTHLY_WORKING_DAYS).toBe(21.3);
    expect(STANDARD_WORK_HOURS_PER_DAY).toBe(7.5);
  });

  describe('calculateDailySalary（基本給 ÷ 21.3・四捨五入）', () => {
    it('基本給 213,000 円 → 日給 10,000 円', () => {
      expect(calculateDailySalary(213000)).toBe(10000);
    });
    it('基本給 250,000 円 → 日給 11,737 円（11,737.08… を四捨五入）', () => {
      expect(calculateDailySalary(250000)).toBe(11737);
    });
    it('基本給 0 円 → 日給 0 円', () => {
      expect(calculateDailySalary(0)).toBe(0);
    });
  });

  describe('calculateHourlySalary（日給 ÷ 7.5・四捨五入）', () => {
    it('基本給 213,000 円 → 時給 1,333 円（10,000 ÷ 7.5 = 1,333.33…）', () => {
      expect(calculateHourlySalary(213000)).toBe(1333);
    });
    it('基本給 250,000 円 → 時給 1,565 円（11,737 ÷ 7.5 = 1,564.93…）', () => {
      expect(calculateHourlySalary(250000)).toBe(1565);
    });
  });

  describe('calculateOvertimeHourlyRate（(基本給 + 手当) ÷ 21.3 ÷ 7.5・切り上げ）', () => {
    it('基本給 250,000 円・手当 0 円 → 1,565 円（1,564.94… を切り上げ）', () => {
      expect(calculateOvertimeHourlyRate(250000, 0)).toBe(1565);
    });
    it('基本給 250,000 円・手当 20,000 円 → 1,691 円（1,690.14… を切り上げ）', () => {
      expect(calculateOvertimeHourlyRate(250000, 20000)).toBe(1691);
    });
    it('基本給・手当とも 0 円 → 0 円', () => {
      expect(calculateOvertimeHourlyRate(0, 0)).toBe(0);
    });
  });
});
