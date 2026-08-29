/**
 * 未ログイン時の遷移先を環境で出し分けるコンポーネント。
 *
 * - portalモード（CloudFront 配信・共通ポータル運用）:
 *     認証（ログイン/新規登録/再設定）は共通ポータル(/)に集約するため、
 *     勤怠の /login は使わず、フルページでポータルへ遷移する。
 *     withReturn 指定時は ?redirect=<現在URL> を付け、ログイン後に元の画面へ復帰させる。
 * - 非portalモード（単独の勤怠アプリ）:
 *     従来どおり勤怠の /login へ（react-router 内遷移）。
 *
 * portalモードの判定は platform ビルドで注入される VITE_API_SAME_ORIGIN_BASE の有無で行う。
 */
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// ポータル同居判定は本コンポーネントと不可分なためここで公開する
// eslint-disable-next-line react-refresh/only-export-components
export const isPortalMode = (): boolean => !!import.meta.env.VITE_API_SAME_ORIGIN_BASE;

interface RedirectToLoginProps {
  /** ログイン後に元の画面へ戻すため ?redirect=<現在URL> を付ける。 */
  withReturn?: boolean;
}

export const RedirectToLogin: React.FC<RedirectToLoginProps> = ({ withReturn }) => {
  const portal = isPortalMode();

  useEffect(() => {
    if (!portal) return;
    const current = window.location.pathname + window.location.search;
    const target = withReturn ? `/?redirect=${encodeURIComponent(current)}` : '/';
    window.location.replace(target);
  }, [portal, withReturn]);

  if (portal) return null; // ポータルへ遷移中
  return <Navigate to="/login" replace />;
};
