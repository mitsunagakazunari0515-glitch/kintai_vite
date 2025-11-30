/**
 * 日付をフォーマットする関数
 * @param dateString - 日付文字列 (YYYY-MM-DD形式)
 * @returns フォーマットされた日付文字列 (yyyy/mm/dd)
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  } catch (error) {
    return dateString;
  }
};

/**
 * 通貨をフォーマットする関数
 * @param amount - 金額（数値）
 * @returns フォーマットされた通貨文字列 (¥1,234,567)
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  
  return `¥${amount.toLocaleString('ja-JP')}`;
};

/**
 * 時刻をフォーマットする関数
 * @param timeString - 時刻文字列 (HH:mm:ss形式またはHH:mm形式)
 * @returns フォーマットされた時刻文字列 (HH:mm)
 */
export const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '-';
  
  try {
    // HH:mm:ss形式またはHH:mm形式を処理
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

