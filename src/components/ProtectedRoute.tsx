import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee';
}

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

