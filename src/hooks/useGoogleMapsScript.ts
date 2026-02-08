/**
 * Google Maps JavaScript API のスクリプトを動的に読み込むフック
 * @googlemaps/js-api-loader を使用（Places API (New) 対応）
 */

import { useState, useEffect } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/**
 * Google Maps API キーを環境変数から取得
 */
export const getGoogleMapsApiKey = (): string | undefined => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
};

/**
 * Google Maps のスクリプトを読み込み、Places API (New) の読み込み完了を待つ
 */
export const useGoogleMapsScript = (): { isLoaded: boolean; error: string | null } => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setError('VITE_GOOGLE_MAPS_API_KEY が設定されていません');
      return;
    }

    if (typeof window === 'undefined') return;

    const init = async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'ja'
        });
        await importLibrary('places');
        setIsLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Google Maps の読み込みに失敗しました');
      }
    };

    init();
  }, []);

  return { isLoaded, error };
};
