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

/**
 * 分単位の数値をHH:mm形式（またはHHH:mm形式）にフォーマットします。
 * 24時間を超える場合は3桁以上の時間を表示します。
 *
 * @param {number | null | undefined} minutes - フォーマット対象の分数。
 * @returns {string} フォーマットされた時刻文字列（HH:mm形式またはHHH:mm形式）。無効な値の場合は'-'を返します。
 * @example
 * ```typescript
 * formatMinutesToTime(90); // '01:30'
 * formatMinutesToTime(1500); // '25:00'
 * formatMinutesToTime(null); // '-'
 * ```
 */
export const formatMinutesToTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
  
  const totalMinutes = Math.floor(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  // 24時間を超える場合は3桁以上の時間を表示
  return `${String(hours).padStart(hours >= 100 ? 3 : 2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * 日付と時刻をYYYY-MM-DD HH:MM:SS形式（JST）にフォーマットします。
 * タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
 *
 * @param {string} date - 日付文字列（YYYY-MM-DD形式）
 * @param {string} time - 時刻文字列（HH:mm形式）
 * @returns {string} YYYY-MM-DD HH:MM:SS形式の時刻文字列（JST）
 * @example
 * ```typescript
 * formatJSTDateTime('2024-01-15', '09:30'); // '2024-01-15 09:30:00'
 * ```
 */
export const formatJSTDateTime = (date: string, time: string): string => {
  const [hours, minutes] = time.split(':');
  return `${date} ${String(hours || '00').padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')}:00`;
};

/**
 * YYYY-MM-DD HH:MM:SS形式（JST）の時刻文字列をDateオブジェクトに変換します。
 * タイムゾーン管理ガイドに基づき、すべての時刻はJSTで統一
 *
 * @param {string | null} dateTimeStr - YYYY-MM-DD HH:MM:SS形式の時刻文字列（JST）
 * @returns {Date | null} Dateオブジェクト（JSTとして解釈）。無効な値の場合はnullを返します。
 * @example
 * ```typescript
 * parseJSTDateTime('2024-01-15 09:30:00'); // Dateオブジェクト（JSTとして解釈）
 * ```
 */
export const parseJSTDateTime = (dateTimeStr: string | null): Date | null => {
  if (!dateTimeStr) return null;
  
  try {
    // YYYY-MM-DD HH:MM:SS形式をDateオブジェクトに変換
    // JSTとして扱うため、+09:00を付与してISO形式に変換
    return new Date(dateTimeStr.replace(' ', 'T') + '+09:00');
  } catch {
    return null;
  }
};

/**
 * YYYY-MM-DD HH:MM:SS形式（JST）の時刻文字列から時刻部分（HH:mm）を抽出します。
 *
 * @param {string | null} dateTimeStr - YYYY-MM-DD HH:MM:SS形式の時刻文字列（JST）
 * @returns {string | null} HH:mm形式の時刻文字列。無効な値の場合はnullを返します。
 * @example
 * ```typescript
 * extractTimeFromJST('2024-01-15 09:30:00'); // '09:30'
 * ```
 */
export const extractTimeFromJST = (dateTimeStr: string | null): string | null => {
  if (!dateTimeStr) return null;
  
  try {
    // YYYY-MM-DD HH:MM:SS形式から時刻部分を抽出
    const match = dateTimeStr.match(/(\d{2}):(\d{2}):\d{2}/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return null;
  } catch {
    return null;
  }
};

