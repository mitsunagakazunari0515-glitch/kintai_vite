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
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fontSizes } from '../config/fontSizes';
import { ProgressBar } from '../components/ProgressBar';
import { Snackbar } from '../components/Snackbar';
import { translateAuthError } from '../utils/errorTranslator';
import { error as logError } from '../utils/logger';
import { saveLoginUserType, saveGoogleLoginInProgress } from '../utils/storageHelper';

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
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ userType: 'admin' | 'employee' } | null>(null);
  const [loginError, setLoginError] = useState<boolean>(false); // ログインエラー状態を追跡
  const { login, signInWithGoogle, isAuthenticated, userRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 権限不足のメッセージをチェック（ProtectedRouteからリダイレクトされた場合）
  useEffect(() => {
    const permissionDeniedStr = localStorage.getItem('permissionDenied');
    if (permissionDeniedStr) {
      try {
        const permissionDenied = JSON.parse(permissionDeniedStr);
        setSnackbar({ message: permissionDenied.message || 'アクセス権限がありません。管理者権限が必要です。', type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        // 表示後は削除
        localStorage.removeItem('permissionDenied');
      } catch (e) {
        // JSONパースエラーは無視
        localStorage.removeItem('permissionDenied');
      }
    }
  }, []);

  // Googleログイン処理中のローディング状態を管理
  // googleLoginInProgressフラグが設定されている間、またはauthLoadingがtrueの間、ローディングを継続
  useEffect(() => {
    const googleLoginInProgress = localStorage.getItem('googleLoginInProgress');
    // Googleログイン処理中（googleLoginInProgressが設定されている、またはauthLoadingがtrue）の場合
    if (googleLoginInProgress === 'true' || authLoading) {
      console.log('Login.tsx: Google login in progress, setting isGoogleLoading to true');
      setIsGoogleLoading(true);
    } else {
      // Googleログイン処理が完了した場合（認可API処理も完了、かつgoogleLoginInProgressフラグが削除された）
      // ただし、認証成功時（isAuthenticated && userRole）は、遷移処理が行われるため、ローディングを継続
      // エラー時（isAuthenticated=false または userRole=null）の場合のみ、ローディングを解除
      if (!isAuthenticated || !userRole) {
        console.log('Login.tsx: Google login completed (with error), setting isGoogleLoading to false');
        setIsGoogleLoading(false);
      } else {
        // 認証成功時は、遷移処理が完了するまでローディングを継続（App.tsxで処理される）
        console.log('Login.tsx: Google login completed (success), keeping isGoogleLoading true until navigation');
      }
    }
  }, [authLoading, isAuthenticated, userRole]);

  // ログイン成功後の遷移処理（userRoleが正しく設定された時点で実行）
  // エラー時（401、403など）はログイン画面に留まる
  // 注意: Googleログインの場合は、App.tsxでリダイレクト処理が行われるため、ここでは処理しない
  useEffect(() => {
    // Googleログインの場合は、App.tsxでリダイレクト処理が行われるため、ここでは処理しない
    if (localStorage.getItem('googleLoginInProgress') === 'true') {
      console.log('Login.tsx: Google login in progress, skipping normal login navigation (App.tsx will handle it)');
      return;
    }

    // 認証状態の確認が完了した後（authLoading=false）にのみ処理を実行
    if (authLoading) {
      return; // 認証状態の確認中は何もしない
    }

    if (!pendingLogin) {
      return; // ログイン試行がない場合は何もしない
    }

    // 認証・認可が成功した場合のみ遷移
    // 注意: isAuthenticatedとuserRoleの両方が真であることを確認
    // エラー時（401、403など）は、checkAuthStatus内でisAuthenticated=false、userRole=nullに設定される
    // そのため、この条件が真になることはない
    // さらに、loginErrorがtrueの場合は、エラーが発生したことを意味するため、遷移しない
    if (isAuthenticated && userRole && !loginError) {
      // 念のため、ログイン試行中（isLoading）の場合は遷移しない
      // エラーが発生した場合、isLoadingはfalseになっているはずだが、念のため確認
      if (isLoading) {
        console.log('Login.tsx: Still loading, waiting...');
        return;
      }

      // pendingLogin.userTypeを直接使用（localStorageから取得する必要はない）
      // 通常ログインの場合は、handleSubmitで設定したpendingLogin.userTypeが確実に使用できる
      const targetUserType = pendingLogin.userType; // pendingLogin.userTypeを直接使用
      const targetPath = targetUserType === 'admin' ? '/admin/employees' : '/employee/attendance';
      
      // デバッグ用: localStorageからも取得して確認（ただし、pendingLogin.userTypeを優先）
      const loginUserTypeFromStorage = localStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
      console.log('Login.tsx: Normal login - Authentication and authorization successful, navigating to:', targetPath);
      console.log('Login.tsx: Normal login - Details: Role:', userRole, 'pendingLogin.userType:', pendingLogin.userType, 'loginUserType from localStorage:', loginUserTypeFromStorage, 'targetUserType (used):', targetUserType);
      setPendingLogin(null); // 遷移フラグをクリア
      setLoginError(false); // エラー状態をクリア
      setIsGoogleLoading(false); // Googleログインのローディングを解除（遷移前に解除）
      localStorage.removeItem('loginUserType'); // 不要になったので削除
      navigate(targetPath, { replace: true });
    } else {
      // 認証・認可が失敗した場合（401、403エラーなど）、ログイン画面に留まる
      // isAuthenticatedがfalse、またはuserRoleがnull、またはloginErrorがtrueの場合は失敗とみなす
      console.log('Login.tsx: Normal login - Authentication or authorization failed, staying on login screen. isAuthenticated:', isAuthenticated, 'userRole:', userRole, 'loginError:', loginError);
      setPendingLogin(null); // 遷移フラグをクリア
      setLoginError(false); // エラー状態をクリア（次のログイン試行に備える）
      setIsGoogleLoading(false); // Googleログインのローディングを解除（エラー時も解除）
      localStorage.removeItem('loginUserType');
      // エラーメッセージは既にスナックバーで表示されている（checkAuthStatus内で設定）
      // ここでは遷移フラグをクリアするだけで、エラーメッセージは既に表示されている
    }
  }, [pendingLogin, isAuthenticated, userRole, authLoading, isLoading, loginError, navigate]);

  // 認証状態の復元中、またはGoogleログイン処理中はローディングを表示
  // Googleログイン処理中（googleLoginInProgressフラグが設定されている、またはisGoogleLoadingがtrue）の場合も、ローディングを表示
  const googleLoginInProgress = localStorage.getItem('googleLoginInProgress');
  if (authLoading || googleLoginInProgress === 'true' || isGoogleLoading) {
    return (
      <>
        <ProgressBar isLoading={true} />
        <div style={{ 
          height: '100vh',
          backgroundColor: '#fff'
        }} />
      </>
    );
  }

  // 既に認証済みの場合の処理
  // 注意: ログイン画面（/login）に直接アクセスした場合のみ自動リダイレクト
  // 従業員画面（/employee/*）などに直接アクセスしようとした場合は、ProtectedRouteが処理するため、ここではリダイレクトしない
  // これにより、管理者が従業員画面に直接アクセスできるようになる
  // Googleログインのフラグがある場合は、App.tsxでloginUserTypeを考慮してリダイレクト処理が行われるため、ここではリダイレクトしない
  if (isAuthenticated && location.pathname === '/login') {
    // Googleログインのフラグがある場合はApp.tsxで処理されるので、ここではリダイレクトしない
    // Cookie、sessionStorage、localStorageの順で確認（リダイレクト時にストレージがクリアされる可能性があるため）
    let googleLoginInProgress: string | null = null;
    
    // 1. Cookieから確認
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'googleLoginInProgress') {
        googleLoginInProgress = decodeURIComponent(value);
        break;
      }
    }
    
    // 2. Cookieにない場合はsessionStorageから確認
    if (!googleLoginInProgress || googleLoginInProgress !== 'true') {
      googleLoginInProgress = sessionStorage.getItem('googleLoginInProgress');
    }
    
    // 3. sessionStorageにもない場合はlocalStorageから確認
    if (!googleLoginInProgress || googleLoginInProgress !== 'true') {
      googleLoginInProgress = localStorage.getItem('googleLoginInProgress');
    }
    
    // 4. URLパラメータにcodeがある場合はOAuthコールバックと判断
    if (!googleLoginInProgress || googleLoginInProgress !== 'true') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('code')) {
        googleLoginInProgress = 'true';
      }
    }
    
    if (googleLoginInProgress === 'true') {
      // loginUserTypeも同様にCookie、sessionStorage、localStorageの順で取得
      let loginUserTypeFromStorage: string | null = null;
      
      // 1. Cookieから取得
      const cookiesForLoginType = document.cookie.split(';');
      for (const cookie of cookiesForLoginType) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'loginUserType') {
          loginUserTypeFromStorage = decodeURIComponent(value);
          break;
        }
      }
      
      // 2. Cookieにない場合はsessionStorageから取得
      if (!loginUserTypeFromStorage) {
        loginUserTypeFromStorage = sessionStorage.getItem('loginUserType');
      }
      
      // 3. sessionStorageにもない場合はlocalStorageから取得
      if (!loginUserTypeFromStorage) {
        loginUserTypeFromStorage = localStorage.getItem('loginUserType');
      }
      
      console.log('Login.tsx: Google login in progress, waiting for App.tsx to handle navigation. loginUserType:', loginUserTypeFromStorage);
      // App.tsxのuseEffectでリダイレクト処理が行われるまで待機
      return null;
    }
    // Googleログインでない場合のみ、通常のリダイレクト処理を実行
    // loginUserTypeを確認して、それに基づいてリダイレクト（通常のログインの場合）
    // Cookie、sessionStorage、localStorageの順で取得
    let loginUserType: 'admin' | 'employee' | null = null;
    
    // 1. Cookieから取得
    const cookiesForUserType = document.cookie.split(';');
    for (const cookie of cookiesForUserType) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'loginUserType') {
        loginUserType = decodeURIComponent(value) as 'admin' | 'employee';
        break;
      }
    }
    
    // 2. Cookieにない場合はsessionStorageから取得
    if (!loginUserType) {
      loginUserType = sessionStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
    }
    
    // 3. sessionStorageにもない場合はlocalStorageから取得
    if (!loginUserType) {
      loginUserType = localStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
    }
    if (loginUserType === 'employee') {
      console.log('Login.tsx: Authenticated user accessing /login, loginUserType is employee, redirecting to employee screen');
      return <Navigate to="/employee/attendance" replace />;
    } else if (loginUserType === 'admin') {
      console.log('Login.tsx: Authenticated user accessing /login, loginUserType is admin, redirecting to admin screen');
      return <Navigate to="/admin/employees" replace />;
    } else {
      // loginUserTypeが設定されていない場合は、userRoleまたはuserTypeを使用
      const role = userRole || userType;
      console.log('Login.tsx: Authenticated user accessing /login, loginUserType not found, using role:', role);
      return <Navigate to={role === 'admin' ? '/admin/employees' : '/employee/attendance'} replace />;
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
    // エラー時の遷移を防ぐため、事前にpendingLoginとloginErrorをクリア
    setPendingLogin(null);
    setLoginError(false);
    try {
      // ログイン前にuserTypeをlocalStorageに保存（login関数内でも保存されるが、念のため）
      console.log('Login.tsx: handleSubmit - Setting loginUserType to localStorage:', userType);
      localStorage.setItem('loginUserType', userType);
      // 確認: localStorageに正しく設定されたか確認
      const verifyLoginUserType = localStorage.getItem('loginUserType');
      console.log('Login.tsx: handleSubmit - Verified loginUserType in localStorage:', verifyLoginUserType);
      
      const success = await login(id, password, userType);
      if (success) {
        // 認証・認可が成功した場合のみ、pendingLoginを設定
        // login関数内でcheckAuthStatus(true)が呼ばれ、成功した場合のみtrueが返される
        // エラー時（401、403など）は例外がスローされ、successはfalseになる
        console.log('Login.tsx: Login successful, waiting for authentication state to update...');
        
        // checkAuthStatusの完了と状態更新を待つため、少し待機
        // 注意: 状態更新は非同期で行われるため、useEffectで監視する方式を維持
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 認証状態を確認してからpendingLoginを設定
        // この時点でisAuthenticatedとuserRoleが更新されているはず
        // ただし、Reactの状態更新は非同期のため、useEffectで再度確認する
        // 注意: エラーが発生した場合、isAuthenticated=false、userRole=nullになっているはず
        // そのため、useEffectでisAuthenticated && userRoleを確認することで、エラー時は遷移しない
        console.log('Login.tsx: Setting pendingLogin, useEffect will handle navigation');
        setPendingLogin({ userType });
        setLoginError(false); // エラー状態をクリア
      } else {
        // ログイン失敗時（認証・認可エラーなど）はloginUserTypeを削除
        // エラー時は確実に遷移しないようにする
        console.log('Login.tsx: Login failed, staying on login screen');
        localStorage.removeItem('loginUserType');
        setPendingLogin(null); // 遷移フラグをクリア（重要：エラー時は遷移しない）
        setLoginError(true); // エラー状態を設定（useEffectで遷移を防ぐ）
        // エラーメッセージは既にcheckAuthStatus内でスナックバーに表示されている
        // ただし、ユーザーに分かりやすくするため、エラーメッセージを設定
        setError('ログインに失敗しました。IDまたはパスワードが正しくありません。');
      }
    } catch (err) {
      logError('Login error:', err);
      localStorage.removeItem('loginUserType');
      setPendingLogin(null); // エラー時は遷移フラグをクリア
      setLoginError(true); // エラー状態を設定（useEffectで遷移を防ぐ）
      setError(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // 注意: signInWithRedirectは即座にリダイレクトするため、その前の処理を確実に実行する必要がある
      // リダイレクト後にストレージがクリアされる可能性があるため、URLパラメータとしても保存を試みる
      // ただし、AmplifyのsignInWithRedirectはURLパラメータを直接制御できないため、
      // コールバックURLにパラメータを追加するために、現在のURLを更新する
      console.log('Login.tsx: handleGoogleLogin - Setting loginUserType:', userType);
      
      // リダイレクト後にストレージがクリアされる可能性があるため、IndexedDBに保存（最も永続的）
      // IndexedDBは、sessionStorageやlocalStorageよりも永続的で、リダイレクト後も保持される可能性が高い
      await saveLoginUserType(userType);
      await saveGoogleLoginInProgress();
      
      // フォールバックとして、Cookie、sessionStorage、localStorageにも保存
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
      document.cookie = `loginUserType=${encodeURIComponent(userType)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `googleLoginInProgress=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      
      sessionStorage.setItem('loginUserType', userType);
      sessionStorage.setItem('googleLoginInProgress', 'true');
      localStorage.setItem('loginUserType', userType);
      localStorage.setItem('googleLoginInProgress', 'true');
      
      console.log('Login.tsx: handleGoogleLogin - Saved loginUserType and googleLoginInProgress to IndexedDB, cookie, sessionStorage, and localStorage:', userType);
      
      // 確認: sessionStorageとlocalStorageに正しく設定されたか確認（同期的に実行）
      const verifyLoginUserTypeSession = sessionStorage.getItem('loginUserType');
      const verifyLoginUserTypeLocal = localStorage.getItem('loginUserType');
      console.log('Login.tsx: handleGoogleLogin - Verified loginUserType in sessionStorage:', verifyLoginUserTypeSession);
      console.log('Login.tsx: handleGoogleLogin - Verified loginUserType in localStorage:', verifyLoginUserTypeLocal);
      
      if (verifyLoginUserTypeSession !== userType) {
        console.error('Login.tsx: handleGoogleLogin - ERROR: loginUserType was not set correctly in sessionStorage! Expected:', userType, 'Got:', verifyLoginUserTypeSession);
      }
      
      setIsGoogleLoading(true);
      setError('');
      
      // signInWithRedirectを呼び出す（これにより即座にリダイレクトが発生する）
      // 注意: この後のコードは実行されない可能性がある（リダイレクトが発生するため）
      // userTypeを渡す（AuthContext内でsessionStorageに保存される）
      await signInWithGoogle(userType);
      // signInWithRedirectを使用しているため、リダイレクトが発生します
      // コールバック後の処理はAuthContextのHubリスナーで処理されます
      // リダイレクト後にストレージがクリアされる可能性があるため、
      // checkAuthStatus内でURLパラメータを確認する処理が追加されている
    } catch (err) {
      logError('Google login error:', err);
      sessionStorage.removeItem('googleLoginInProgress');
      sessionStorage.removeItem('loginUserType');
      localStorage.removeItem('googleLoginInProgress');
      localStorage.removeItem('loginUserType'); // エラー時は削除
      setError(translateAuthError(err));
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <ProgressBar isLoading={isLoading || isGoogleLoading} />
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
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

