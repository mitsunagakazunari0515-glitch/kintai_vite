/**
 * 位置情報取得ユーティリティ
 * navigator.geolocation.getCurrentPosition を使用して現在地を取得します。
 */

/** 位置情報の取得オプション */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
} as const;

/** 取得した位置情報 */
export interface GeolocationPosition {
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 精度（メートル） */
  accuracy: number;
}

/** 位置情報取得エラーの種類 */
export type GeolocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT';

/** 位置情報取得エラー */
export interface GeolocationError {
  /** エラーコード */
  code: GeolocationErrorCode;
  /** ユーザー向けメッセージ */
  message: string;
}

/** 位置情報取得結果（成功） */
export interface GeolocationSuccess {
  success: true;
  position: GeolocationPosition;
}

/** 位置情報取得結果（失敗） */
export interface GeolocationFailure {
  success: false;
  error: GeolocationError;
}

/** 位置情報取得結果 */
export type GeolocationResult = GeolocationSuccess | GeolocationFailure;

/** ユーザー向けエラーメッセージのマッピング */
const ERROR_MESSAGES: Record<GeolocationErrorCode, string> = {
  PERMISSION_DENIED: '位置情報の利用が許可されていません。ブラウザの設定から位置情報を許可してください。',
  POSITION_UNAVAILABLE: '位置情報を取得できませんでした。GPSをオンにするか、開けた場所でお試しください。',
  TIMEOUT: '位置情報の取得がタイムアウトしました。しばらく待ってから再度お試しください。'
};

/**
 * 現在位置を取得する
 * @param options - Geolocation APIのオプション（指定しない場合はデフォルトを使用）
 * @returns 位置情報またはエラー
 */
export const getCurrentPositionAsync = (
  options: PositionOptions = GEOLOCATION_OPTIONS
): Promise<GeolocationResult> => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        success: false,
        error: {
          code: 'POSITION_UNAVAILABLE',
          message: 'お使いのブラウザは位置情報に対応していません。'
        }
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos: globalThis.GeolocationPosition) => {
        resolve({
          success: true,
          position: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }
        });
      },
      (error: GeolocationPositionError) => {
        const code: GeolocationErrorCode =
          error.code === 1
            ? 'PERMISSION_DENIED'
            : error.code === 2
              ? 'POSITION_UNAVAILABLE'
              : 'TIMEOUT';
        resolve({
          success: false,
          error: {
            code,
            message: ERROR_MESSAGES[code]
          }
        });
      },
      options
    );
  });
};
