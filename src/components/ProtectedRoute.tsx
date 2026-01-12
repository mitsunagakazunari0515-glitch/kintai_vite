import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { log } from '../utils/logger';

/**
 * 保護されたルートコンポーネントのプロパティを表すインターフェース。
 */
interface ProtectedRouteProps {
  /** 保護されたルート内で表示する子要素。 */
  children: React.ReactNode;
  /** 必要なユーザーロール。指定しない場合は認証済みであればアクセス可能。 */
  requiredRole?: 'admin' | 'employee';
}

/**
 * 保護されたルートコンポーネント。
 * 認証状態とユーザーロールをチェックし、条件を満たさない場合はログインページにリダイレクトします。
 *
 * @param {ProtectedRouteProps} props - 保護されたルートのプロパティ。
 * @returns {JSX.Element | null} 認証済みの場合は子要素、未認証の場合はリダイレクト、読み込み中はnullを返します。
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const location = useLocation();

  // 認証状態の復元中は何も表示しない（リダイレクトしない）
  if (isLoading) {
    return null; // またはローディングスピナーを表示
  }

  // 認証されていない、またはuserRoleがnullの場合はログイン画面にリダイレクト
  // 認証が成功するまで（APIから200レスポンスが返ってくるまで）ログイン画面に留まる
  if (!isAuthenticated || !userRole) {
    return <Navigate to="/login" replace />;
  }

  // ロールチェック
  // 注意: フロントエンドでのロールチェックのみ。APIでの権限チェックは別途行われる
  // 管理者（admin）は常に全画面にアクセス可能（従業員画面を含む）
  // 従業員（employee）は従業員画面のみアクセス可能、管理者画面にはアクセス不可
  if (requiredRole) {
    if (userRole === 'admin') {
      // 管理者は全画面にアクセス可能
      // permissionDeniedをクリア（以前に設定されていた場合でも）
      const permissionDenied = localStorage.getItem('permissionDenied');
      if (permissionDenied) {
        log('ProtectedRoute: Clearing permissionDenied for admin user');
        localStorage.removeItem('permissionDenied');
      }
      // Googleログインのフラグは、App.tsxでリダイレクト処理が完了するまで削除しない
      // 注意: loginUserTypeとgoogleLoginInProgressは、App.tsxでリダイレクト処理が完了するまで保持する必要がある
    } else if (userRole === 'employee' && requiredRole !== 'employee') {
      // 従業員が管理者画面にアクセスしようとした場合
      const permissionDenied = localStorage.getItem('permissionDenied');
      if (!permissionDenied) {
        localStorage.setItem('permissionDenied', JSON.stringify({
          message: 'アクセス権限がありません。管理者権限が必要です。',
          attemptedPath: location.pathname
        }));
      }
      return <Navigate to="/login" replace />;
    }
    // 従業員が従業員画面にアクセスする場合は、そのまま許可
  }

  log('ProtectedRoute: Access granted. userRole:', userRole, 'requiredRole:', requiredRole, 'path:', location.pathname);
  return <>{children}</>;
};

