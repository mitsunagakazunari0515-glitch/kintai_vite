/**
 * 現在の年度を取得する関数
 * 日本の会計年度（4月始まり）を基準とする
 * @returns 現在の年度（例: 2024）
 */
export const getCurrentFiscalYear = (): number => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-11から1-12に変換
  
  // 4月以降は当年、3月までは前年
  return month >= 4 ? year : year - 1;
};

/**
 * 指定された日付が指定された年度内かどうかを判定する関数
 * @param dateString - 日付文字列 (YYYY-MM-DD形式)
 * @param fiscalYear - 年度
 * @returns 年度内の場合true
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

