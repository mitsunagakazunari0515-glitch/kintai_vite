import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  // 認証状態の復元中は何も表示しない（リダイレクトしない）
  if (isLoading) {
    return null; // またはローディングスピナーを表示
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

