/**
 * ファイル名: Login.tsx
 * 画面名: ログイン画面
 * 説明: 管理者と従業員のログイン機能を提供する画面
 * 機能:
 *   - ID・パスワード入力
 *   - 管理者/従業員のログインタイプ切り替え
 *   - 認証処理
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';
import { ProgressBar } from '../components/ProgressBar';
import { translateAuthError } from '../utils/errorTranslator';
import { error as logError } from '../utils/logger';

/**
 * ログイン画面コンポーネント。
 * 管理者と従業員のログイン機能を提供します。
 * ID・パスワード入力、ログインタイプ切り替え、認証処理を行います。
 *
 * @returns {JSX.Element | null} ログイン画面コンポーネント。認証状態の復元中はnullを返します。
 */
export const Login: React.FC = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'admin' | 'employee'>('employee');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signInWithGoogle, isAuthenticated, userRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 認証状態の復元中は何も表示しない
  if (authLoading) {
    return null;
  }

  // 既に認証済みの場合は適切な画面にリダイレクト
  if (isAuthenticated) {
    // Googleログインのフラグがある場合はApp.tsxで処理されるので、ここでは通常のリダイレクトのみ
    if (localStorage.getItem('googleLoginInProgress') !== 'true') {
      return <Navigate to={userRole === 'admin' ? '/admin/employees' : '/employee/attendance'} replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id || !password) {
      setError('IDとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(id, password, userType);
      if (success) {
        if (userType === 'admin') {
          navigate('/admin/employees');
        } else {
          navigate('/employee/attendance');
        }
      } else {
        setError('ログインに失敗しました。IDまたはパスワードが正しくありません。');
      }
    } catch (err) {
      logError('Login error:', err);
      setError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError('');
      // GoogleログインからのコールバックかどうかをlocalStorageに保存
      localStorage.setItem('googleLoginInProgress', 'true');
      await signInWithGoogle();
      // signInWithRedirectを使用しているため、リダイレクトが発生します
      // コールバック後の処理はAuthContextのHubリスナーで処理されます
    } catch (err) {
      logError('Google login error:', err);
      localStorage.removeItem('googleLoginInProgress');
      setError(translateAuthError(err));
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <ProgressBar isLoading={isLoading || isGoogleLoading} />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, #fdf7ee 0%, #f5f0e8 40%, #e8ddcf 100%)'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '1.5rem' : '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px',
          margin: isMobile ? '1rem' : '0'
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#8b5a2b' }}>
            A・1勤怠管理システム
          </h1>
          <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ログインタイプ
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setUserType('employee')}
                onMouseEnter={(e) => {
                  if (userType !== 'employee') {
                    e.currentTarget.style.backgroundColor = '#9a6b3d';
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.cursor = 'pointer';
                  }
                }}
                onMouseLeave={(e) => {
                  if (userType !== 'employee') {
                    e.currentTarget.style.backgroundColor = '#b08968';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.cursor = 'pointer';
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${userType === 'employee' ? '#8b5a2b' : '#e0d2c2'}`,
                  borderRadius: '4px',
                  backgroundColor: userType === 'employee' ? '#8b5a2b' : '#b08968',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: userType === 'employee' ? 'bold' : 'normal',
                  boxShadow: userType === 'employee'
                    ? '0 3px 8px rgba(91,59,31,0.35)'
                    : 'none',
                  transform: userType === 'employee' ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.2s ease',
                  opacity: userType === 'employee' ? 1 : 0.7
                }}
              >
                従業員
              </button>
              <button
                type="button"
                onClick={() => setUserType('admin')}
                onMouseEnter={(e) => {
                  if (userType !== 'admin') {
                    e.currentTarget.style.backgroundColor = '#9a6b3d';
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.cursor = 'pointer';
                  }
                }}
                onMouseLeave={(e) => {
                  if (userType !== 'admin') {
                    e.currentTarget.style.backgroundColor = '#b08968';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.cursor = 'pointer';
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${userType === 'admin' ? '#8b5a2b' : '#e0d2c2'}`,
                  borderRadius: '4px',
                  backgroundColor: userType === 'admin' ? '#8b5a2b' : '#b08968',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: userType === 'admin' ? 'bold' : 'normal',
                  boxShadow: userType === 'admin'
                    ? '0 3px 8px rgba(91,59,31,0.35)'
                    : 'none',
                  transform: userType === 'admin' ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.2s ease',
                  opacity: userType === 'admin' ? 1 : 0.7
                }}
              >
                管理者
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ID(メールアドレス)
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box'
              }}
              placeholder="ID(メールアドレス)を入力"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: fontSizes.input,
                boxSizing: 'border-box'
              }}
              placeholder="パスワードを入力"
            />
          </div>
          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '4px',
              fontSize: fontSizes.medium
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(145deg, #7a4a1f 0%, #b46c2f 100%)';
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.cursor = 'pointer';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(145deg, #8b5a2b 0%, #c47c3f 100%)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.cursor = 'pointer';
              }
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: isLoading 
                ? 'linear-gradient(145deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(145deg, #8b5a2b 0%, #c47c3f 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: fontSizes.button,
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.2s',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
          {/* Googleログインボタン */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              position: 'relative'
            }}>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#d1d5db'
              }}></div>
              <span style={{
                padding: '0 1rem',
                color: '#6b7280',
                fontSize: fontSizes.small
              }}>または</span>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#d1d5db'
              }}></div>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              onMouseEnter={(e) => {
                if (!isGoogleLoading) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGoogleLoading) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.cursor = 'pointer';
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#ffffff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: fontSizes.button,
                fontWeight: '500',
                cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: isGoogleLoading ? 0.6 : 1
              }}
            >
              {isGoogleLoading ? (
                <>
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '0.25rem' }}>
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
                    />
                  </svg>
                  Googleでログイン
                </>
              )}
            </button>
          </div>
          {/* パスワード再設定リンク */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link
              to="/password-reset"
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                fontSize: fontSizes.medium
              }}
            >
              パスワードをお忘れの方はこちら
            </Link>
          </div>
          {/* 新規登録リンク */}
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link
              to="/signup"
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                fontSize: fontSizes.medium
              }}
            >
              新規登録はこちら
            </Link>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

