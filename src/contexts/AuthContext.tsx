import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  isLoading: boolean; // 認証状態の復元中かどうか
  login: (id: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

