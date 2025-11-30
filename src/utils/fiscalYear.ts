/**
 * 現在の年度を取得します。
 * 日本の会計年度（4月始まり）を基準とします。
 *
 * @returns {number} 現在の年度（例: 2024）。4月以降は当年、3月までは前年を返します。
 * @example
 * ```typescript
 * // 2024年5月の場合
 * getCurrentFiscalYear(); // 2024
 * // 2024年3月の場合
 * getCurrentFiscalYear(); // 2023
 * ```
 */
export const getCurrentFiscalYear = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-11から1-12に変換
  
  // 4月以降は当年、3月までは前年
  return month >= 4 ? year : year - 1;
};

/**
 * 指定された日付が指定された年度内かどうかを判定します。
 *
 * @param {string} dateString - 判定対象の日付文字列（YYYY-MM-DD形式を想定）。
 * @param {number} fiscalYear - 判定対象の年度。
 * @returns {boolean} 年度内の場合true、それ以外の場合false。無効な日付の場合はfalseを返します。
 * @example
 * ```typescript
 * isInFiscalYear('2024-05-15', 2024); // true
 * isInFiscalYear('2024-03-15', 2024); // false（2023年度）
 * ```
 */
export const isInFiscalYear = (dateString: string, fiscalYear: number): boolean => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // 日付の年度を計算
    const dateFiscalYear = month >= 4 ? year : year - 1;
    
    return dateFiscalYear === fiscalYear;
  } catch (error) {
    return false;
  }
};

