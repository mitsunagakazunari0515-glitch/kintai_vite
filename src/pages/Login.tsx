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
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';

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
  const [showReset, setShowReset] = useState(false);
  const [resetId, setResetId] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { login, isAuthenticated, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 認証状態の復元中は何も表示しない
  if (isLoading) {
    return null;
  }

  // 既に認証済みの場合は適切な画面にリダイレクト
  if (isAuthenticated) {
    return <Navigate to={userRole === 'admin' ? '/admin/employees' : '/employee/attendance'} replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id || !password) {
      setError('IDとパスワードを入力してください');
      return;
    }

    const success = login(id, password, userType);
    if (success) {
      if (userType === 'admin') {
        navigate('/admin/employees');
      } else {
        navigate('/employee/attendance');
      }
    } else {
      setError('ログインに失敗しました');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');

    if (!resetId.trim()) {
      setResetMessage('IDまたはメールアドレスを入力してください');
      return;
    }

    // 実際のシステムではここでパスワード再設定メール送信APIを呼び出す
    setResetMessage('パスワード再設定手続きの案内を送信しました（デモ用メッセージ）');
    setResetId('');
  };

  return (
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
              ID
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
              placeholder="IDを入力"
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #7a4a1f 0%, #b46c2f 100%)';
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(145deg, #8b5a2b 0%, #c47c3f 100%)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.cursor = 'pointer';
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
            background: 'linear-gradient(145deg, #8b5a2b 0%, #c47c3f 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: fontSizes.button,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.2s'
            }}
          >
            ログイン
          </button>
          {/* パスワード再設定エリア */}
          <div style={{ marginTop: '1.5rem', fontSize: fontSizes.medium }}>
            <button
              type="button"
              onClick={() => {
                setShowReset(!showReset);
                setResetMessage('');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                color: '#2563eb',
                textDecoration: 'underline',
                cursor: 'pointer',
                boxShadow: 'none',
                borderRadius: 0,
                minHeight: 'auto',
                minWidth: 'auto'
              }}
            >
              パスワードをお忘れの方はこちら
            </button>
            {showReset && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontSize: fontSizes.medium, color: '#4b5563' }}>
                  登録済みのIDまたはメールアドレスを入力してください。パスワード再設定の案内を送信します。
                </p>
                <form onSubmit={handleResetSubmit}>
                  <input
                    type="text"
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    placeholder="ID または メールアドレス"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      boxSizing: 'border-box',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <button
                    type="submit"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.cursor = 'pointer';
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: fontSizes.input,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, transform 0.2s'
                    }}
                  >
                    再設定リンクを送信
                  </button>
                </form>
                {resetMessage && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: fontSizes.small,
                      color: resetMessage.includes('送信しました') ? '#059669' : '#dc2626'
                    }}
                  >
                    {resetMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

