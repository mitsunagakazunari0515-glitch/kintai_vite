/**
 * 日付文字列をyyyy/mm/dd形式にフォーマットします。
 *
 * @param {string | null | undefined} dateString - フォーマット対象の日付文字列（YYYY-MM-DD形式を想定）。
 * @returns {string} フォーマットされた日付文字列（yyyy/mm/dd形式）。無効な値の場合は'-'を返します。
 * @example
 * ```typescript
 * formatDate('2024-03-15'); // '2024/03/15'
 * formatDate(null); // '-'
 * ```
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
 * 数値を通貨形式（¥1,234,567）にフォーマットします。
 *
 * @param {number | null | undefined} amount - フォーマット対象の金額。
 * @returns {string} フォーマットされた通貨文字列（¥1,234,567形式）。無効な値の場合は'-'を返します。
 * @example
 * ```typescript
 * formatCurrency(1234567); // '¥1,234,567'
 * formatCurrency(null); // '-'
 * ```
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  
  return `¥${amount.toLocaleString('ja-JP')}`;
};

/**
 * 時刻文字列をHH:mm形式にフォーマットします。
 *
 * @param {string | null | undefined} timeString - フォーマット対象の時刻文字列（HH:mm:ss形式またはHH:mm形式を想定）。
 * @returns {string} フォーマットされた時刻文字列（HH:mm形式）。無効な値の場合は'-'を返します。
 * @example
 * ```typescript
 * formatTime('09:30:00'); // '09:30'
 * formatTime('09:30'); // '09:30'
 * formatTime(null); // '-'
 * ```
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

