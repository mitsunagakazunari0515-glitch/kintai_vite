/**
 * 日本語文字列のエンコード・デコードユーティリティ（Lambda/Node.js用）
 * 
 * HTTPヘッダーにはISO-8859-1文字のみが許可されるため、
 * 日本語などの非ASCII文字を含む場合はBase64エンコードを使用します。
 * 
 * エンコード方式: UTF-8 → Base64
 * デコード方式: Base64 → UTF-8
 * 
 * 注意: この実装はフロントエンドの`src/utils/japaneseEncoder.ts`と同じロジックを使用します。
 */

/**
 * 文字列がISO-8859-1文字のみかどうかを判定します。
 * ISO-8859-1は0x00-0xFFの範囲の文字です。
 * 
 * @param str - 判定する文字列
 * @returns ISO-8859-1文字のみの場合はtrue、それ以外はfalse
 */
export const isIso88591Only = (str: string): boolean => {
  // Unicode範囲 0x0000-0x00FF（ISO-8859-1）のみかチェック
  return !/[^\u0000-\u00FF]/.test(str);
};

/**
 * 日本語などの非ASCII文字を含む文字列をBase64エンコードします。
 * 
 * エンコード方式:
 * 1. Buffer.from()を使用してUTF-8バイト配列に変換
 * 2. toString('base64')でBase64エンコード
 * 
 * @param str - エンコードする文字列
 * @returns Base64エンコードされた文字列
 * @throws エンコードに失敗した場合はエラーをスロー
 */
export const encodeJapaneseString = (str: string): string => {
  if (!str) {
    return '';
  }

  try {
    // 常にBase64エンコード（英語のみでも問題なく動作）
    // UTF-8でエンコードしてからBase64エンコード
    // Node.jsのBufferはデフォルトでUTF-8を使用
    return Buffer.from(str, 'utf8').toString('base64');
  } catch (error: any) {
    console.error('Failed to encode Japanese string:', error);
    throw new Error(`Failed to encode Japanese string: ${error.message || error}`);
  }
};

/**
 * Base64エンコードされた文字列をデコードします。
 * 
 * デコード方式:
 * 1. Buffer.from()を使用してBase64デコード
 * 2. toString('utf8')でUTF-8文字列に変換
 * 
 * @param encodedStr - Base64エンコードされた文字列
 * @returns デコードされた文字列
 * @throws デコードに失敗した場合はエラーをスロー
 */
export const decodeJapaneseString = (encodedStr: string): string => {
  if (!encodedStr) {
    return '';
  }

  try {
    // Base64デコードしてからUTF-8デコード
    return Buffer.from(encodedStr, 'base64').toString('utf8');
  } catch (error: any) {
    console.error('Failed to decode Japanese string:', error);
    throw new Error(`Failed to decode Japanese string: ${error.message || error}`);
  }
};

/**
 * HTTPヘッダーに日本語を含む文字列を設定する際のエンコード処理を行います。
 * 
 * 注意: フラグ不要版。常にBase64エンコードします（英語のみでも問題なく動作）。
 * デコード時は自動判定するため、フラグは不要です。
 * 
 * @param str - エンコードする文字列
 * @returns エンコードされた文字列とエンコードフラグのオブジェクト（後方互換性のため残していますが、isEncodedは常にtrue）
 * @deprecated 新しいコードでは encodeJapaneseString() を直接使用してください
 */
export const encodeForHttpHeader = (str: string): {
  encodedValue: string;
  isEncoded: boolean;
} => {
  if (!str) {
    return { encodedValue: '', isEncoded: false };
  }

  // 常にBase64エンコード（英語のみでも問題なく動作）
  return {
    encodedValue: encodeJapaneseString(str),
    isEncoded: true,
  };
};

/**
 * HTTPヘッダーから取得したエンコードされた文字列をデコードします。
 * 
 * 注意: フラグ不要版。常にBase64デコードを試みます（失敗した場合は元の値を返す）。
 * 
 * @param encodedValue - エンコードされた文字列（常にBase64エンコードされている想定）
 * @param isEncoded - このパラメータは無視されます（後方互換性のため残しています）
 * @returns デコードされた文字列
 */
export const decodeFromHttpHeader = (
  encodedValue: string,
  isEncoded?: boolean
): string => {
  if (!encodedValue) {
    return '';
  }

  try {
    // 常にBase64デコードを試みる（失敗した場合は元の値を返す）
    return decodeJapaneseString(encodedValue);
  } catch (error: any) {
    // デコードに失敗した場合は、元の値を返す（後方互換性のため）
    console.warn('Failed to decode header value, using original value:', error);
    return encodedValue;
  }
};

