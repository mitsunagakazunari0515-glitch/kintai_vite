import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { ProgressBar } from './components/ProgressBar';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { PasswordReset } from './pages/PasswordReset';
import { EmployeeList } from './pages/admin/EmployeeList';
import { EmployeeRegistration } from './pages/admin/EmployeeRegistration';
import { EmployeePayroll } from './pages/admin/EmployeePayroll';
import { AllowanceMaster } from './pages/admin/AllowanceMaster';
import { DeductionMaster } from './pages/admin/DeductionMaster';
import { RequestApproval } from './pages/admin/RequestApproval';
import { AttendanceList } from './pages/admin/AttendanceList';
import { EmployeeAttendance } from './pages/admin/EmployeeAttendance';
import { WorkLocationMaster } from './pages/admin/WorkLocationMaster';
import { Attendance } from './pages/employee/Attendance';
import { LeaveRequest } from './pages/employee/LeaveRequest';
import { getLoginUserType, getGoogleLoginInProgress, removeLoginUserType, removeGoogleLoginInProgress, saveGoogleLoginInProgress } from './utils/storageHelper';
import { log, error as logError, warn } from './utils/logger';

/**
 * 管理者用ルートコンポーネント。
 * 管理者向けの画面ルーティングを定義します。
 *
 * @returns {JSX.Element} 管理者用ルートコンポーネント。
 */
const AdminRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/employees" element={<EmployeeList />} />
      <Route path="/employees/register" element={<EmployeeRegistration />} />
      <Route path="/employees/edit/:id" element={<EmployeeRegistration />} />
      <Route path="/employees/:employeeId/payroll" element={<EmployeePayroll />} />
      <Route path="/attendance" element={<AttendanceList />} />
      <Route path="/employee-attendance" element={<EmployeeAttendance />} />
      <Route path="/allowances" element={<AllowanceMaster />} />
      <Route path="/deductions" element={<DeductionMaster />} />
      <Route path="/work-locations" element={<WorkLocationMaster />} />
      <Route path="/requests" element={<RequestApproval />} />
      <Route path="*" element={<Navigate to="/admin/employees" replace />} />
    </Routes>
  </Layout>
);

/**
 * 従業員用ルートコンポーネント。
 * 従業員向けの画面ルーティングを定義します。
 *
 * @returns {JSX.Element} 従業員用ルートコンポーネント。
 */
const EmployeeRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/leave" element={<LeaveRequest />} />
      <Route path="*" element={<Navigate to="/employee/attendance" replace />} />
    </Routes>
  </Layout>
);

/**
 * アプリケーションルートコンポーネント。
 * 認証状態に応じたルーティングを管理します。
 *
 * @returns {JSX.Element | null} アプリケーションルートコンポーネント。認証状態の復元中はnullを返します。
 */
const AppRoutes = () => {
  const { isLoading, isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedRef = useRef<string | null>(null);
  
  // URLの正規化: 末尾スラッシュを削除（/login/ → /login）
  // サーバー側（Amplify/CloudFront）で末尾スラッシュが追加される場合があるため、
  // クライアント側で正規化してReact Routerで処理できるようにする
  useEffect(() => {
    const pathname = location.pathname;
    
    // 主要なパス（/login, /signup, /password-reset）で末尾スラッシュがある場合、削除
    const pathsToNormalize = ['/login/', '/signup/', '/password-reset/'];
    if (pathsToNormalize.includes(pathname)) {
      const newPath = pathname.slice(0, -1);
      const search = location.search;
      const hash = location.hash;
      
      // 既に正規化済みのパス名の場合はスキップ（無限ループ防止）
      if (normalizedRef.current === newPath) {
        return;
      }
      
      // 正規化済みフラグを設定
      normalizedRef.current = newPath;
      // navigateのみを使用してリダイレクト
      navigate(newPath + search + hash, { replace: true });
      return;
    }
    
    // その他のパスで末尾スラッシュがある場合も削除（ルートパス（/）を除く）
    if (pathname !== '/' && pathname.endsWith('/')) {
      const newPath = pathname.slice(0, -1);
      const search = location.search;
      const hash = location.hash;
      
      // 既に正規化済みのパス名の場合はスキップ（無限ループ防止）
      if (normalizedRef.current === newPath) {
        return;
      }
      
      // 正規化済みフラグを設定
      normalizedRef.current = newPath;
      // navigateのみを使用してリダイレクト
      navigate(newPath + search + hash, { replace: true });
    } else {
      // 正規化不要な場合は現在のパス名を記録
      normalizedRef.current = pathname;
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  // コンポーネントマウント時に、IndexedDB、URLパラメータ、CookieからloginUserTypeを取得してストレージに保存
  // これにより、Googleログインのリダイレクト後も値を保持できる
  useEffect(() => {
    const restoreLoginUserType = async () => {
      // 1. IndexedDBから取得を試みる（最も永続的）
      let loginUserType = await getLoginUserType();
      
      // 2. IndexedDBにない場合は、URLパラメータから取得を試みる
      if (!loginUserType) {
        const urlParams = new URLSearchParams(window.location.search);
        loginUserType = urlParams.get('loginUserType') as 'admin' | 'employee' | null;
        
        // URLからパラメータを削除（クリーンなURLを保つ）
        if (loginUserType && (loginUserType === 'admin' || loginUserType === 'employee')) {
          urlParams.delete('loginUserType');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
        }
      }
      
      // 3. URLパラメータにもない場合は、Cookieから取得を試みる
      if (!loginUserType || (loginUserType !== 'admin' && loginUserType !== 'employee')) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'loginUserType') {
            loginUserType = decodeURIComponent(value) as 'admin' | 'employee';
            break;
          }
        }
      }
      
      if (loginUserType === 'admin' || loginUserType === 'employee') {
        // loginUserTypeをストレージに復元
        sessionStorage.setItem('loginUserType', loginUserType);
        localStorage.setItem('loginUserType', loginUserType);
        // Cookieを削除（使用後は不要）
        document.cookie = 'loginUserType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    };
    
    restoreLoginUserType();
  }, []);

  // Googleログインからのコールバックかどうかをチェックして直接遷移
  // 認証が成功するまで（userRoleが設定されるまで）遷移しない
  // 注意: エラー時（401、403など）は遷移しない
  // ログイン画面で選択されたユーザータイプ（loginUserType）を考慮してリダイレクト先を決定
  // 管理者の場合でも、ユーザーが「従業員」を選択していた場合は従業員画面にリダイレクト
  useEffect(() => {
    const handleGoogleLoginRedirect = async () => {
      // 認証状態の確認が完了していない場合は何もしない
      if (isLoading) {
        return;
      }

      // Googleログインのフラグが設定されている場合のみ処理
      // IndexedDB、Cookie、sessionStorage、localStorageの順で確認（リダイレクト時にストレージがクリアされる可能性があるため）
      let googleLoginInProgress = false;
      
      // 1. IndexedDBから確認（最も永続的）
      try {
        googleLoginInProgress = await getGoogleLoginInProgress();
      } catch (error) {
        logError('App.tsx: Failed to get googleLoginInProgress from IndexedDB:', error);
      }
      
      // 2. IndexedDBにない場合は、Cookieから確認
      if (!googleLoginInProgress) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'googleLoginInProgress' && value === 'true') {
            googleLoginInProgress = true;
            break;
          }
        }
      }
      
      // 3. Cookieにもない場合はsessionStorageから確認
      if (!googleLoginInProgress) {
        googleLoginInProgress = sessionStorage.getItem('googleLoginInProgress') === 'true';
      }
      
      // 4. sessionStorageにもない場合はlocalStorageから確認
      if (!googleLoginInProgress) {
        googleLoginInProgress = localStorage.getItem('googleLoginInProgress') === 'true';
      }
      
      // 5. URLパラメータにcodeがある場合はOAuthコールバックと判断
      if (!googleLoginInProgress) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('code')) {
          // OAuthコールバック検出
          googleLoginInProgress = true;
          await saveGoogleLoginInProgress();
          // フォールバックとして、Cookie、sessionStorage、localStorageにも保存
          const expirationDate = new Date();
          expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
          document.cookie = `googleLoginInProgress=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
          sessionStorage.setItem('googleLoginInProgress', 'true');
          localStorage.setItem('googleLoginInProgress', 'true');
        }
      }
      
      if (!googleLoginInProgress) {
        return;
      }
      
      // 認証・認可が成功した場合のみ遷移（isAuthenticatedとuserRoleが両方設定されている場合）
      // エラー時（401、403など）は、isAuthenticatedがfalseまたはuserRoleがnullになるため、遷移しない
      if (isAuthenticated && userRole) {
        // ログイン画面で選択されたユーザータイプを確認
        // 注意: loginUserTypeは、Googleログイン時にLogin.tsxで設定される
        const currentPath = window.location.pathname;
        
        // IndexedDB、Cookie、sessionStorage、localStorageの順でloginUserTypeを取得
        // リダイレクト時にストレージがクリアされる可能性があるため、IndexedDBから優先的に取得
        let loginUserType: 'admin' | 'employee' | null = null;
        
        // 1. IndexedDBから取得（最も永続的）
        try {
          loginUserType = await getLoginUserType();
        } catch (error) {
          logError('App.tsx: Failed to get loginUserType from IndexedDB:', error);
        }
        
        // 2. IndexedDBにない場合は、Cookieから取得
        if (!loginUserType) {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'loginUserType') {
              loginUserType = decodeURIComponent(value) as 'admin' | 'employee';
              break;
            }
          }
        }
        
        // 3. Cookieにもない場合はsessionStorageから取得
        if (!loginUserType) {
          loginUserType = sessionStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
        }
        
        // 4. sessionStorageにもない場合はlocalStorageから取得
        if (!loginUserType) {
          loginUserType = localStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
        }
        
        // 取得した値をすべてのストレージに保存（念のため）
        if (loginUserType) {
          sessionStorage.setItem('loginUserType', loginUserType);
          localStorage.setItem('loginUserType', loginUserType);
        }
        
        if (!loginUserType) {
          warn('App.tsx: Google login - loginUserType not found in IndexedDB, cookie, localStorage, or sessionStorage. This may cause incorrect redirection.');
          warn('App.tsx: Google login - Will use userRole for redirection:', userRole);
        }
        
        // 権限チェックが完了するまで少し待機（checkAuthStatusでloginUserTypeが削除される可能性があるため）
        // permissionDeniedが設定されている場合は、権限チェックでエラーが発生した可能性があるため、遷移しない
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 権限チェック後にloginUserTypeが削除されている場合は遷移しない（権限不足のため）
        let finalLoginUserType: 'admin' | 'employee' | null = null;
        try {
          finalLoginUserType = await getLoginUserType();
        } catch (error) {
          // IndexedDBから取得できない場合は、localStorageから確認
          finalLoginUserType = localStorage.getItem('loginUserType') as 'admin' | 'employee' | null;
        }
        
        // loginUserTypeが削除されている場合は、権限チェックでエラーが発生した可能性があるため、遷移しない
        if (!finalLoginUserType && loginUserType) {
          log('App.tsx: loginUserType was removed after permission check, not redirecting');
          await removeGoogleLoginInProgress();
          return;
        }
        
        // permissionDeniedが設定されている場合も遷移しない
        const permissionDenied = localStorage.getItem('permissionDenied');
        if (permissionDenied) {
          log('App.tsx: permissionDenied is set, not redirecting');
          await removeGoogleLoginInProgress();
          return;
        }
        
        // loginUserTypeを優先的に使用してリダイレクト（管理者の場合でも、ユーザーの選択を尊重）
        // 現在のパスが管理者画面または従業員画面でない場合のみリダイレクト（既に適切な画面にいる場合はリダイレクトしない）
        const isAdminPath = currentPath.startsWith('/admin/');
        const isEmployeePath = currentPath.startsWith('/employee/');
        
        // 最終的なloginUserTypeを使用（権限チェック後に削除されていない場合）
        const targetLoginUserType = finalLoginUserType || loginUserType;
        
        if (!isAdminPath && !isEmployeePath) {
          // ログイン画面（/login）またはルート（/）にいる場合、loginUserTypeに基づいてリダイレクト
          if (targetLoginUserType === 'employee') {
            navigate('/employee/attendance', { replace: true });
            // リダイレクト後にloginUserTypeとgoogleLoginInProgressをクリア
            await removeLoginUserType();
            await removeGoogleLoginInProgress();
            return;
          } else if (targetLoginUserType === 'admin') {
            navigate('/admin/employees', { replace: true });
            // リダイレクト後にloginUserTypeとgoogleLoginInProgressをクリア
            await removeLoginUserType();
            await removeGoogleLoginInProgress();
            return;
          } else {
            log('App.tsx: Google login - loginUserType not found, using userRole:', userRole);
            if (userRole === 'admin') {
              navigate('/admin/employees', { replace: true });
            } else if (userRole === 'employee') {
              navigate('/employee/attendance', { replace: true });
            }
            await removeLoginUserType();
            await removeGoogleLoginInProgress();
            return;
          }
        } else {
          // 既に管理者画面または従業員画面にいる場合
          if (targetLoginUserType === 'employee' && isAdminPath) {
            navigate('/employee/attendance', { replace: true });
            await removeLoginUserType();
            await removeGoogleLoginInProgress();
            return;
          } else if (targetLoginUserType === 'admin' && isEmployeePath) {
            navigate('/admin/employees', { replace: true });
            await removeLoginUserType();
            await removeGoogleLoginInProgress();
            return;
          }
          // 既に適切な画面にいる
          await removeLoginUserType();
          await removeGoogleLoginInProgress();
        }
      } else {
        // エラー時（認証・認可が失敗した場合）、ログイン画面に留まる
        // 認証・認可失敗
        // Googleログインのフラグを削除（エラー時も、checkAuthStatusで既に削除されているが、念のため）
        await removeLoginUserType();
        await removeGoogleLoginInProgress();
      }
    };
    
    handleGoogleLoginRedirect();
  }, [isLoading, isAuthenticated, userRole, navigate]);


  // ログイン画面で既に認証済みの場合でも、ログイン画面を表示する
  // ブラウザの戻るボタンで戻った場合や、role:adminの従業員が従業員側としてログインしたい場合などに対応
  // Googleログインのコールバック時のみ、自動リダイレクトを実行する
  // Googleログインのコールバックは、URLパラメータにcodeがあることで判定する（googleLoginInProgressフラグは使用しない）
  const isLoginPage = location.pathname === '/login' || location.pathname === '/login/' || location.pathname === '/';
  
  // ログイン画面の場合は、Googleログインのコールバック時のみ自動リダイレクトを実行
  // それ以外の場合は、認証状態に関係なくログイン画面を表示する
  // ただし、ログイン処理中（localStorageにloginUserTypeが設定されている場合）は、Login.tsxの遷移処理を待つ
  if (isLoginPage) {
    // URLパラメータにcodeがある場合（OAuthコールバック時）のみ、自動リダイレクトを実行
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.get('code') !== null;
    
    // ログイン処理中かどうかを判定（localStorageにloginUserTypeが設定されている場合）
    // ただし、OAuthコールバックでない場合は、loginUserTypeを無視する（ブラウザの戻るボタンで戻った場合など）
    // OAuthコールバック時のみ、loginUserTypeを有効にする
    const loginUserType = hasCode ? localStorage.getItem('loginUserType') : null;
    const isLoginInProgress = loginUserType !== null;
    
    if (hasCode && isAuthenticated && userRole) {
      // Googleログインのコールバック時のみ、自動リダイレクトを実行
      const targetPath = userRole === 'admin' ? '/admin/employees' : '/employee/attendance';
      log('App.tsx: Google login callback detected (code parameter found) - redirecting to:', targetPath, {
        userRole,
        targetPath,
        hasCode
      });
      return <Navigate to={targetPath} replace />;
    }
    
    // ログイン処理中の場合は、Login.tsxの遷移処理を待つ（ログイン画面を表示する）
    // Login.tsxのuseEffectで遷移処理が実行されるため、Routesをレンダリングする必要がある
    if (isLoginInProgress && isAuthenticated && userRole) {
      log('App.tsx: Login in progress, Login.tsx will handle redirect', {
        userRole,
        loginUserType,
        isAuthenticated
      });
      // Login.tsxの遷移処理を待つため、Routesをレンダリングする（ログイン画面が表示される）
    }
    
    // それ以外の場合は、ログイン画面を表示する（認証状態に関係なく）
    // ブラウザの戻るボタンで戻った場合でも、ログイン画面を表示する
    if (isAuthenticated && userRole && !isLoginInProgress) {
      log('App.tsx: Already authenticated on login page, but showing login screen (user may want to switch role)', {
        userRole,
        isAuthenticated,
        hasCode,
        isLoginInProgress
      });
    }
  }

  // 認証状態の復元中はプログレスバーのみを表示
  // ただし、既に認証済みでログイン画面にいる場合は上記でリダイレクトされるため、ここには到達しない
  if (isLoading) {
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

  return (
    <Routes>
      {/* 末尾スラッシュなしのパス */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/password-reset" element={<PasswordReset />} />
      {/* 末尾スラッシュ付きのパスにも直接対応（404エラーを防ぐため） */}
      <Route path="/login/" element={<Login />} />
      <Route path="/signup/" element={<SignUp />} />
      <Route path="/password-reset/" element={<PasswordReset />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeRoutes />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/**
 * アプリケーションのルートコンポーネント。
 * 認証プロバイダーとルーティングを設定します。
 *
 * @returns {JSX.Element} アプリケーションコンポーネント。
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
