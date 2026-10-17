/**
 * パーツカタログ「入力/位置の選択（地図）」。住所検索・地図での位置選択。
 * 名前・見出しは汎用の言葉で書く（システム名を出さない・UI ルール §7）。
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

export default { title: '入力/位置の選択（地図）', component: GoogleMapLocationPicker };

export const PC = { render: () => <Demo /> };
export const スマホ = { render: () => <Demo isMobile /> };
