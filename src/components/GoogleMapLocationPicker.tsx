/**
 * Google Maps を使用した住所検索・位置選択コンポーネント
 * Places API (New) の PlaceAutocompleteElement を使用
 * - 住所検索（Autocomplete）
 * - 地図上にピン（Marker）表示
 * - ピンドラッグで座標を調整
 */

import { useEffect, useRef } from 'react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';
import { fontSizes } from '../config/fontSizes';
import { error as logError } from '../utils/logger';

// @types/google.maps は google.maps.* を型としてのみ提供するため、
// window.google 経由でランタイムの値として参照できるように拡張する
declare global {
  interface Window {
    google: typeof google;
  }
}

export interface LocationResult {
  latitude: number;
  longitude: number;
  address?: string;
}

interface GoogleMapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (result: LocationResult) => void;
  placeholder?: string;
  isMobile?: boolean;
  mapHeight?: number;
}

const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 }; // 東京

/**
 * 住所検索・地図表示・ドラッグ可能なピンで緯度経度を取得するコンポーネント
 */
export const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
  placeholder = '住所を検索して選択（例: 東京都渋谷区道玄坂）',
  isMobile = false,
  mapHeight = 300
}) => {
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  const { isLoaded, error } = useGoogleMapsScript();

  useEffect(() => {
    const autocompleteContainer = autocompleteContainerRef.current;
    if (!isLoaded || !autocompleteContainer || !mapRef.current || !window.google) return;

    const google = window.google;
    const hasInitialLocation = latitude !== 0 && longitude !== 0;
    const center = hasInitialLocation ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: hasInitialLocation ? 17 : 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true
    });
    mapInstanceRef.current = map;

    const markerPos = hasInitialLocation ? { lat: latitude, lng: longitude } : center;
    const marker = new google.maps.Marker({
      map: hasInitialLocation ? map : null,
      position: markerPos,
      draggable: true,
      title: '位置をドラッグして調整'
    });
    markerRef.current = marker;

    const notify = (res: LocationResult) => onLocationChangeRef.current(res);

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        notify({ latitude: pos.lat(), longitude: pos.lng() });
      }
    });

    map.addListener('click', (e: { latLng: { lat: () => number; lng: () => number } }) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      marker.setMap(map);
      notify({ latitude: lat, longitude: lng });
    });

    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      placeholder,
      includedRegionCodes: ['jp']
    });
    placeAutocomplete.style.width = '100%';
    placeAutocomplete.style.boxSizing = 'border-box';
    placeAutocomplete.style.backgroundColor = '#ffffff';
    placeAutocomplete.style.colorScheme = 'light';
    placeAutocomplete.style.border = '1px solid #d1d5db';
    placeAutocomplete.style.borderRadius = '4px';
    placeAutocomplete.style.setProperty('--gmp-mat-color-surface', '#ffffff');
    placeAutocomplete.style.setProperty('--gmp-mat-color-on-surface', '#374151');
    autocompleteContainer.innerHTML = '';
    autocompleteContainer.appendChild(placeAutocomplete);
    autocompleteRef.current = placeAutocomplete;

    const handleSelect = async (e: google.maps.places.PlacePredictionSelectEvent) => {
      try {
        const place = await e.placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'location'] });
        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          notify({
            latitude: lat,
            longitude: lng,
            address: place.formattedAddress ?? undefined
          });
          marker.setPosition({ lat, lng });
          marker.setMap(map);
          map.setCenter({ lat, lng });
          map.setZoom(17);
        }
      } catch (err) {
        logError('Place fetch error:', err);
      }
    };

    placeAutocomplete.addEventListener('gmp-select', handleSelect as unknown as EventListener);

    return () => {
      placeAutocomplete.removeEventListener('gmp-select', handleSelect as unknown as EventListener);
      if (autocompleteContainer.contains(placeAutocomplete)) {
        placeAutocomplete.remove();
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      autocompleteRef.current = null;
      mapInstanceRef.current = null;
    };
    // 地図・マーカー・検索欄の初期化は isLoaded/placeholder が変わった時のみ行う。
    // latitude/longitudeの変更時にこの地図を作り直さないよう、意図的に依存配列から除外している
    // （ピン位置の更新は下のuseEffectでmarker.setPosition()により行う）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, placeholder]);

  useEffect(() => {
    if (!isLoaded || !markerRef.current || !mapInstanceRef.current) return;
    const hasLocation = latitude !== 0 && longitude !== 0;
    if (hasLocation) {
      const pos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(pos);
      markerRef.current.setMap(mapInstanceRef.current);
    }
  }, [isLoaded, latitude, longitude]);

  if (error) {
    return (
      <div style={{
        padding: '0.75rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '4px',
        fontSize: fontSizes.small,
        color: '#991b1b'
      }}>
        {error}
        <div style={{ marginTop: '0.25rem', fontSize: fontSizes.small }}>
          .env に VITE_GOOGLE_MAPS_API_KEY を設定し、Google Cloud Console で Maps JavaScript API と Places API (New) を有効にしてください。
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        padding: '0.75rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        fontSize: fontSizes.small,
        color: '#6b7280'
      }}>
        Google Maps を読み込み中...
      </div>
    );
  }

  return (
    <div data-mobile={isMobile}>
      <div ref={autocompleteContainerRef} style={{ marginBottom: '0.5rem' }} />
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: `${mapHeight}px`,
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          overflow: 'hidden'
        }}
      />
      <div style={{ fontSize: fontSizes.small, color: '#6b7280', marginTop: '0.25rem' }}>
        {latitude !== 0 && longitude !== 0
          ? `緯度 ${latitude.toFixed(6)}, 経度 ${longitude.toFixed(6)} （ピンをドラッグして位置を調整）`
          : '住所を検索して選択するか、地図をクリックしてピンを配置してください'}
      </div>
    </div>
  );
};
