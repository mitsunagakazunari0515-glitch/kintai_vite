/**
 * 位置情報取得カスタムフック
 * 打刻時に現在地（緯度・経度・精度）を取得するためのロジックを提供します。
 */

import { useCallback, useState } from 'react';
import {
  getCurrentPositionAsync,
  GEOLOCATION_OPTIONS,
  type GeolocationResult,
  type GeolocationPosition
} from '../utils/geolocation';

/** フックの戻り値 */
export interface UseGeolocationReturn {
  /** 現在位置を取得する関数 */
  getLocation: () => Promise<GeolocationResult>;
  /** 取得中かどうか */
  isLoading: boolean;
}

/**
 * 位置情報取得ロジックを分離したカスタムフック
 * ボタン押下時に位置情報を取得し、API通信に渡すために使用します。
 *
 * @example
 * ```tsx
 * const { getLocation, isLoading } = useGeolocation();
 *
 * const handleStamp = async () => {
 *   const result = await getLocation();
 *   if (!result.success) {
 *     setError(result.error.message);
 *     return;
 *   }
 *   await clockIn({
 *     latitude: result.position.latitude,
 *     longitude: result.position.longitude,
 *     accuracy: result.position.accuracy
 *   });
 * };
 *
 * return (
 *   <button onClick={handleStamp} disabled={isLoading}>
 *     {isLoading ? '位置取得中...' : '出勤'}
 *   </button>
 * );
 * ```
 */
export const useGeolocation = (): UseGeolocationReturn => {
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<GeolocationResult> => {
    setIsLoading(true);
    try {
      return await getCurrentPositionAsync(GEOLOCATION_OPTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getLocation, isLoading };
};

export type { GeolocationResult, GeolocationPosition };
