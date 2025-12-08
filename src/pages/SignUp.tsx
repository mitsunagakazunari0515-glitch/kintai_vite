/**
 * ファイル名: SignUp.tsx
 * 画面名: 新規登録画面
 * 説明: 新規ユーザーの登録機能を提供する画面
 * 機能:
 *   - メールアドレス・パスワード入力
 *   - 確認コード入力
 *   - 登録完了
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';
import { ProgressBar } from '../components/ProgressBar';
import { translateAuthError } from '../utils/errorTranslator';
import { error as logError } from '../utils/logger';

/**
 * サインアップ画面コンポーネント。
 * 新規ユーザーの登録機能を提供します。
 *
 * @returns {JSX.Element | null} サインアップ画面コンポーネント。認証状態の復元中はnullを返します。
 */
export const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [step, setStep] = useState<'signup' | 'confirm' | 'complete'>('signup');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { signUp, confirmSignUp, isAuthenticated, isLoading: authLoading } = useAuth();
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

  // 既に認証済みの場合はログイン画面にリダイレクト
  if (isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'パスワードは8文字以上である必要があります';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'パスワードには小文字が含まれている必要があります';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'パスワードには大文字が含まれている必要があります';
    }
    if (!/(?=.*[0-9])/.test(password)) {
      return 'パスワードには数字が含まれている必要があります';
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return 'パスワードには記号が含まれている必要があります';
    }
    return null;
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!validateEmail(email)) {
      setError('正しいメールアドレスの形式で入力してください');
      return;
    }

    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードと確認用パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email.trim(), password);
      setStep('confirm');
      setMessage('確認コードをメールアドレスに送信しました。コードを確認して入力してください。');
    } catch (err) {
      logError('Signup error:', err);
      setError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!confirmationCode.trim()) {
      setError('確認コードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      await confirmSignUp(email.trim(), confirmationCode.trim());
      setStep('complete');
      setMessage('登録が完了しました。ログイン画面からログインしてください。');
      // 3秒後にログイン画面にリダイレクト
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      logError('Signup confirmation error:', err);
      setError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ProgressBar isLoading={isLoading} />
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
            新規登録
          </h1>

        {step === 'signup' && (
          <form onSubmit={handleSignUpSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
                placeholder="メールアドレスを入力"
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
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
                placeholder="パスワードを入力（8文字以上）"
              />
              <div style={{ marginTop: '0.5rem', fontSize: fontSizes.small, color: '#6b7280' }}>
                パスワード要件: 大文字、小文字、数字、記号を含む8文字以上
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                パスワード（確認）
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
                placeholder="パスワードを再入力"
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
                transition: 'background 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '登録中...' : '登録'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline',
                  fontSize: fontSizes.medium
                }}
              >
                すでにアカウントをお持ちの方はこちら
              </Link>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirmSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: fontSizes.medium, color: '#4b5563' }}>
                メールアドレスに送信された確認コードを入力してください。
              </p>
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                <div style={{ fontSize: fontSizes.small, color: '#6b7280', marginBottom: '0.25rem' }}>登録メールアドレス</div>
                <div style={{ fontSize: fontSizes.medium, fontWeight: 'bold', color: '#374151' }}>{email}</div>
              </div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                確認コード
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: fontSizes.input,
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1
                }}
                placeholder="6桁の確認コード"
                maxLength={6}
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

            {message && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: '#d1fae5',
                color: '#059669',
                borderRadius: '4px',
                fontSize: fontSizes.medium
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
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
                transition: 'background 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '確認中...' : '確認'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('signup');
                setConfirmationCode('');
                setError('');
                setMessage('');
              }}
              disabled={isLoading}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: fontSizes.button,
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              戻る
            </button>
          </form>
        )}

        {step === 'complete' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#d1fae5',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <div style={{ fontSize: fontSizes.large, fontWeight: 'bold', color: '#059669', marginBottom: '0.5rem' }}>
                登録が完了しました
              </div>
              <div style={{ fontSize: fontSizes.medium, color: '#4b5563' }}>
                ログイン画面に移動します...
              </div>
            </div>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(145deg, #8b5a2b 0%, #c47c3f 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: fontSizes.button,
                fontWeight: 'bold'
              }}
            >
              ログイン画面へ
            </Link>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

