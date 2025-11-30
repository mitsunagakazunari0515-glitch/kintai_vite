import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * ユーザーのロールを表す型。
 */
type UserRole = 'admin' | 'employee' | null;

/**
 * 認証コンテキストの型を表すインターフェース。
 */
interface AuthContextType {
  /** 認証済みかどうか。 */
  isAuthenticated: boolean;
  /** ユーザーのロール。 */
  userRole: UserRole;
  /** ユーザーID。 */
  userId: string | null;
  /** 認証状態の復元中かどうか。 */
  isLoading: boolean;
  /** ログイン処理を行う関数。 */
  login: (id: string, password: string, role: UserRole) => boolean;
  /** ログアウト処理を行う関数。 */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 認証プロバイダーコンポーネント。
 * アプリケーション全体で認証状態を管理します。
 *
 * @param {Object} props - コンポーネントのプロパティ。
 * @param {ReactNode} props.children - 子要素。
 * @returns {JSX.Element} 認証プロバイダーコンポーネント。
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // 初期状態は読み込み中

  useEffect(() => {
    // ローカルストレージから認証情報を復元
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth);
        setIsAuthenticated(true);
        setUserRole(auth.role);
        setUserId(auth.userId);
      } catch (error) {
        console.error('Failed to parse auth data:', error);
        localStorage.removeItem('auth');
      }
    }
    setIsLoading(false); // 認証状態の復元が完了
  }, []);

  const login = (id: string, password: string, role: UserRole): boolean => {
    // 簡易的な認証（実際の実装ではバックエンドAPIを使用）
    // デモ用: 任意のID/PWでログイン可能
    if (id && password && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserId(id);
      localStorage.setItem('auth', JSON.stringify({ role, userId: id }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証コンテキストを使用するカスタムフック。
 * AuthProviderの外で使用するとエラーが発生します。
 *
 * @returns {AuthContextType} 認証コンテキストの値。
 * @throws {Error} AuthProviderの外で使用された場合にエラーをスローします。
 * @example
 * ```typescript
 * const { isAuthenticated, userRole, login, logout } = useAuth();
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

