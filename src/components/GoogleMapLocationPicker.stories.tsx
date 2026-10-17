/**
 * 勤怠のパーツ: 勤務地の住所検索・地図での位置選択（勤務地マスタ）。
 * Storybook には platform-ui から「勤怠/パーツ/…」として出る。
 * 地図の表示には VITE_GOOGLE_MAPS_API_KEY が必要（無い場合は読み込みエラーの表示を確認できる）。
 */
import { useState } from 'react';
import { GoogleMapLocationPicker, type LocationResult } from './GoogleMapLocationPicker';

const Demo = ({ isMobile }: { isMobile?: boolean }) => {
  const [loc, setLoc] = useState<LocationResult>({ latitude: 35.6812, longitude: 139.7671 });
  return (
    <div>
      <GoogleMapLocationPicker
        latitude={loc.latitude}
        longitude={loc.longitude}
        onLocationChange={setLoc}
        isMobile={isMobile}
      />
      <p>
        選択中: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} {loc.address ?? ''}
      </p>
    </div>
  );
};

export default { title: 'パーツ/勤務地の位置選択', component: GoogleMapLocationPicker, globals: { system: 'kintai' } };

export const PC = { render: () => <Demo /> };
export const スマホ = { render: () => <Demo isMobile /> };
