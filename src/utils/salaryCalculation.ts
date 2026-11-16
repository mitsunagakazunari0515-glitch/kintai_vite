/**
 * 正社員の給与単価（日給・時給・残業単価）の計算。
 * 仕様: docs/backend/BUSINESS_LOGIC_GUIDE.md §4.2 / docs/frontend/UI_SPECIFICATION.md
 */

/** 月平均稼働日数（日給 = 基本給 ÷ この値）。2026-11-14 に 20.5 → 21.3 へ変更 */
export const AVERAGE_MONTHLY_WORKING_DAYS = 21.3;

/** 1日の所定労働時間（時間）。時給 = 日給 ÷ この値 */
export const STANDARD_WORK_HOURS_PER_DAY = 7.5;

/**
 * 正社員の日給を計算する（四捨五入・1円単位）。
 * @param baseSalary 月額基本給（円）
 * @returns 日給（円）
 */
export const calculateDailySalary = (baseSalary: number): number =>
  Math.round(baseSalary / AVERAGE_MONTHLY_WORKING_DAYS);

/**
 * 正社員の時給を計算する（四捨五入済みの日給 ÷ 7.5 を四捨五入・1円単位）。
 * @param baseSalary 月額基本給（円）
 * @returns 時給（円）
 */
export const calculateHourlySalary = (baseSalary: number): number =>
  Math.round(calculateDailySalary(baseSalary) / STANDARD_WORK_HOURS_PER_DAY);

/**
 * 残業単価（時給単価）を計算する（切り上げ・1円単位）。
 * 残業単価 = (基本給 + 残業代に含む手当の合計) ÷ 21.3 ÷ 7.5
 * @param baseSalary 基本給（円）
 * @param allowancesForOvertime 残業代に含む手当（includeInOvertime）の金額合計（円）
 * @returns 残業単価（円/時間）
 */
export const calculateOvertimeHourlyRate = (baseSalary: number, allowancesForOvertime: number): number =>
  Math.ceil((baseSalary + allowancesForOvertime) / AVERAGE_MONTHLY_WORKING_DAYS / STANDARD_WORK_HOURS_PER_DAY);
