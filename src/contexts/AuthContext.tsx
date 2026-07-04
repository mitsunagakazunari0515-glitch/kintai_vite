import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession, signInWithRedirect, fetchUserAttributes, resetPassword, confirmResetPassword, signUp, confirmSignUp } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Amplify } from 'aws-amplify';
import { getAmplifyConfigPath, getAmplifyEnvironment, setAmplifyApiEndpoint } from '../config/amplifyConfig';
import { log, error as logError, warn } from '../utils/logger';
import { getAuthorization, refreshAuthorization } from '../utils/authApi';
import { translateApiError } from '../utils/apiErrorTranslator';
import { Snackbar } from '../components/Snackbar';
import { ProgressBar } from '../components/ProgressBar';
import { saveLoginUserType, saveGoogleLoginInProgress, getLoginUserType, getGoogleLoginInProgress } from '../utils/storageHelper';

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
  /** ユーザー名（従業員名）。 */
  userName: string | null;
  /** 認証状態の復元中かどうか。 */
  isLoading: boolean;
  /** ログイン処理を行う関数（メール/パスワード）。 */
  login: (id: string, password: string, role: UserRole) => Promise<boolean>;
  /** Googleログイン処理を行う関数。 */
  signInWithGoogle: (userType?: 'admin' | 'employee') => Promise<void>;
  /** ログアウト処理を行う関数。 */
  logout: () => Promise<void>;
  /** パスワード再設定コードを送信する関数。 */
  requestPasswordReset: (username: string) => Promise<{ nextStep: string }>;
  /** パスワード再設定コードを確認して新しいパスワードを設定する関数。 */
  confirmPasswordReset: (username: string, confirmationCode: string, newPassword: string) => Promise<void>;
  /** ユーザー登録を行う関数。 */
  signUp: (username: string, password: string) => Promise<{ userId: string; nextStep: string }>;
  /** サインアップの確認コードを確認する関数。 */
  confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
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
  const [userName, setUserName] = useState<string | null>(null); // ユーザー名（従業員名）
  const [isLoading, setIsLoading] = useState<boolean>(true); // 初期状態は読み込み中
  const [isAmplifyConfigured, setIsAmplifyConfigured] = useState<boolean>(false); // Amplifyが設定されているかどうか
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false); // API通信中のローディング状態

  // 初期ロード時にログイン画面の場合は、認証状態をリセットする
  // ブラウザの戻るボタンで戻った場合、ストレージに認証情報が残っている可能性があるため、
  // ログイン画面では認証状態をリセットして、常に未認証状態として扱う
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/login' || currentPath === '/login/' || currentPath === '/';
    
    if (isLoginPage) {
      // URLパラメータにcodeがある場合（OAuthコールバック時）は、認証状態をリセットしない
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.get('code') !== null;
      
      if (!hasCode) {
        // ログイン画面では認証状態をリセットして、常に未認証状態として扱う
        log('ℹ️ Login page detected on mount - resetting auth state');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserName(null);
      }
    }
  }, []); // マウント時のみ実行

  // 認可情報を取得してロールを判定する関数
  const fetchUserRole = useCallback(async (): Promise<UserRole> => {
    setIsApiLoading(true);
    try {
      const authInfo = await getAuthorization();
      
      // 在籍していない場合はエラーをスロー
      if (!authInfo.isActive) {
        const errorMessage = '在籍していない従業員はログインできません';
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => setSnackbar(null), 5000);
        throw new Error(errorMessage);
      }
      
      // ユーザー名を設定（姓・名の順序で表示）
      // API仕様: firstName = 苗字（姓）, lastName = 名前（名）
      // 表示時は日本語の慣習に従って「姓 名」の順序で結合する（例: "山田 太郎"）
      // つまり `${firstName} ${lastName}` の順序で表示する
      const displayName = `${authInfo.firstName} ${authInfo.lastName}`;
      
      // ローカルストレージに認可情報を保存
      const userInfo = {
        employeeId: authInfo.employeeId,
        requestedBy: displayName, // 姓・名の順序で結合した表示名
        role: authInfo.role,
        email: authInfo.email
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // ユーザー名を設定
      setUserName(displayName);
      
      return authInfo.role as UserRole;
    } catch (err) {
      logError('Failed to fetch user role:', err);
      // エラー時はローカルストレージから認可情報を削除
      localStorage.removeItem('userInfo');
      
      // エラーメッセージをスナックバーで表示
      const errorMessage = translateApiError(err);
      setSnackbar({ message: errorMessage, type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
      
      throw err;
    } finally {
      setIsApiLoading(false);
    }
  }, []);

  // 認証状態をチェックする関数（useCallbackでメモ化）
  const checkAuthStatus = useCallback(async (forceCheck: boolean = false) => {
    // ログイン画面の場合は、API通信をスキップ（ログインボタン押下時のみAPI通信）
    // ただし、forceCheckがtrueの場合や、loginUserType/googleLoginInProgressが設定されている場合は実行
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/login' || currentPath === '/';
    
    // URLパラメータまたはCookieからloginUserTypeを取得（リダイレクト後のコールバック時に使用）
    const urlParams = new URLSearchParams(window.location.search);
    let loginUserTypeFromUrl = urlParams.get('loginUserType');
    
    // URLパラメータにない場合は、Cookieから取得を試みる
    if (!loginUserTypeFromUrl || (loginUserTypeFromUrl !== 'admin' && loginUserTypeFromUrl !== 'employee')) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'loginUserType') {
          loginUserTypeFromUrl = decodeURIComponent(value);
          break;
        }
      }
    }
    
    if (loginUserTypeFromUrl === 'admin' || loginUserTypeFromUrl === 'employee') {
      log('🔍 checkAuthStatus - Found loginUserType in URL parameters or cookies:', loginUserTypeFromUrl);
      sessionStorage.setItem('loginUserType', loginUserTypeFromUrl);
      localStorage.setItem('loginUserType', loginUserTypeFromUrl);
      // Cookieを削除（使用後は不要）
      document.cookie = 'loginUserType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    
    // sessionStorageから優先的に取得（リダイレクト時にlocalStorageがクリアされる可能性があるため）
    let loginUserType = sessionStorage.getItem('loginUserType');
    if (!loginUserType) {
      loginUserType = localStorage.getItem('loginUserType');
    }
    // URLパラメータがある場合は、それを優先
    if (loginUserTypeFromUrl && (loginUserTypeFromUrl === 'admin' || loginUserTypeFromUrl === 'employee')) {
      loginUserType = loginUserTypeFromUrl;
    }
    
    let googleLoginInProgress = sessionStorage.getItem('googleLoginInProgress');
    if (!googleLoginInProgress) {
      googleLoginInProgress = localStorage.getItem('googleLoginInProgress');
    }
    
    // Googleログイン後のコールバックの可能性がある場合、フラグを設定
    // AmplifyのコールバックURLには通常、codeパラメータが含まれる
    if (!googleLoginInProgress && urlParams.get('code')) {
      log('🔍 checkAuthStatus - Detected OAuth callback (code parameter found), setting googleLoginInProgress flag');
      googleLoginInProgress = 'true';
      
      // Cookie、sessionStorage、localStorageに保存
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
      document.cookie = `googleLoginInProgress=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      sessionStorage.setItem('googleLoginInProgress', 'true');
      localStorage.setItem('googleLoginInProgress', 'true');
      
      // OAuthコールバック時、loginUserTypeがストレージから取得できない場合は、Cookieから復元を試みる
      if (!loginUserType) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'loginUserType') {
            loginUserType = decodeURIComponent(value);
            log('🔍 checkAuthStatus - Found loginUserType in cookie during OAuth callback:', loginUserType);
            sessionStorage.setItem('loginUserType', loginUserType);
            localStorage.setItem('loginUserType', loginUserType);
            break;
          }
        }
      }
    }
    
    // CookieからもloginUserTypeを確認（まだ取得できていない場合）
    if (!loginUserType) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'loginUserType') {
          loginUserType = decodeURIComponent(value);
          log('🔍 checkAuthStatus - Found loginUserType in cookie:', loginUserType);
          sessionStorage.setItem('loginUserType', loginUserType);
          localStorage.setItem('loginUserType', loginUserType);
          break;
        }
      }
    }
    
    // ログイン画面で既に認証済みの場合、認証状態をリセットしてから早期リターン（ブラウザの戻るボタンなどで戻った場合）
    // ただし、forceCheckがtrueの場合（ログイン試行時）は、APIを呼び出す必要がある
    // ブラウザの戻るボタンで戻った場合、ストレージに認証情報が残っている可能性があるが、
    // ログイン画面では認証状態をリセットし、常に未認証状態として扱う
    if (isLoginPage && !forceCheck) {
      // 既に認証済みの状態が設定されている場合は、認証状態をリセットしてから早期リターン
      if (isAuthenticated && userRole) {
        log('ℹ️ Login page detected - resetting auth state (browser back detected)');
        // ログイン画面では認証状態をリセットして、常に未認証状態として扱う
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserName(null);
        setIsLoading(false);
        return;
      }
      
      // ログイン画面では、ストレージから状態を復元しない
      // ブラウザの戻るボタンで戻った場合でも、認証状態を復元せず、常に未認証状態として扱う
      // これにより、ユーザーが明示的にログイン操作を行うまで、認証状態が復元されない
      log('ℹ️ Login page detected - skipping auth check (user may want to switch role, not restoring from storage)');
      setIsLoading(false);
      return;
    }
    
    if (isLoginPage && !forceCheck && !loginUserType && !googleLoginInProgress) {
      log('ℹ️ Login page detected - skipping auth check (no login attempt detected)');
      setIsLoading(false);
      return;
    }
    
    // ログイン試行が検出された場合は、ログイン画面でもAPI通信を実行
    if (isLoginPage && (forceCheck || loginUserType || googleLoginInProgress)) {
      log('ℹ️ Login page detected but login attempt found - proceeding with auth check');
    }
    
    try {
      // ユーザーが認証されているかチェック
      // ログインしていない場合はUserUnAuthenticatedExceptionがスローされる（これは正常な状態）
      let user = null;
      try {
        user = await getCurrentUser();
      } catch (authError: any) {
        // UserUnAuthenticatedExceptionは正常な状態（ログインしていない）
        if (authError?.name === 'UserUnAuthenticatedException' || authError?.message?.includes('User needs to be authenticated')) {
          log('ℹ️ User is not authenticated (this is normal on login screen)');
          // 認証されていない状態を正常に処理
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserName(null);
          setIsLoading(false);
          return;
        }
        // その他のエラーは再スロー
        throw authError;
      }
      
      // Identity Poolのエラーを無視して、User Poolの認証のみを使用
      // Googleログイン直後は、トークンが取得できるまで少し待機する必要がある場合がある
      let session = null;
      let retryCount = 0;
      const maxRetries = 5; // 最大5回リトライ（合計約2.5秒待機）
      
      while (retryCount < maxRetries) {
        try {
          session = await fetchAuthSession();
          // トークンが取得できた場合はループを抜ける
          if (session?.tokens?.idToken && session?.tokens?.accessToken) {
            break;
          }
        } catch (sessionError) {
          // Identity Poolのエラーは無視（User Poolの認証のみを使用する場合）
          log('⚠ Identity Pool session fetch failed (using User Pool only):', sessionError);
          // User Poolの認証のみを使用する場合は、sessionがなくても続行
        }
        
        // トークンが取得できていない場合は、少し待機してリトライ
        if (!session?.tokens?.idToken || !session?.tokens?.accessToken) {
          retryCount++;
          if (retryCount < maxRetries) {
            log(`⏳ Waiting for tokens... (retry ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms待機
          }
        } else {
          break; // トークンが取得できた場合はループを抜ける
        }
      }
      
      log('🔍 Checking auth status...');
      log('User:', user);
      log('Session:', session);
      log('Retry count:', retryCount);
      
      // User Poolの認証が成功していれば続行（Identity Poolはオプション）
      if (user) {
        // トークンが存在するか確認（API通信には有効なトークンが必要）
        const idToken = session?.tokens?.idToken;
        const accessToken = session?.tokens?.accessToken;
        
        // トークンが存在しない場合は、API通信をスキップしてログイン画面に留まる
        if (!idToken || !accessToken) {
          log('⚠️ Tokens not found or invalid after retries - skipping API call and staying on login screen');
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserName(null);
          localStorage.removeItem('auth');
          localStorage.removeItem('userInfo');
          setIsLoading(false);
          // エラーメッセージをスナックバーで表示
          setSnackbar({ 
            message: '認証トークンの取得に失敗しました。再度ログインしてください。', 
            type: 'error' 
          });
          setTimeout(() => setSnackbar(null), 5000);
          return; // 早期リターンしてログイン画面に留まる
        }
        
        // ユーザー属性を取得（メールアドレスなどを含む）
        let userEmail = '';
        try {
          const attributes = await fetchUserAttributes();
          log('👤 User attributes:', attributes);
          userEmail = attributes.email || attributes['cognito:username'] || '';
        } catch (attrError) {
          warn('Failed to fetch user attributes:', attrError);
        }
        
        // メールアドレスを取得（OAuthログインの場合はsignInDetailsから取得）
        if (!userEmail) {
          if (user.signInDetails?.loginId) {
            userEmail = user.signInDetails.loginId;
          } else if (user.username) {
            userEmail = user.username;
          }
        }
        
        // トークンからメールアドレスを取得してみる
        if (!userEmail && idToken) {
          try {
            // IDトークンからメールアドレスをデコード
            // JWTトークンは3つの部分に分かれている（header.payload.signature）
            const payload = JSON.parse(atob(idToken.toString().split('.')[1]));
            userEmail = payload.email || payload['cognito:username'] || '';
            log('📧 Email from token:', userEmail);
          } catch (e) {
            warn('Failed to decode token:', e);
          }
        }
        
        log('✅ User authenticated:', {
          userId: user.userId,
          email: userEmail,
          username: user.username,
          signInDetails: user.signInDetails
        });
        
        // APIから認可情報を取得してロールを判定
        // 認証が成功するまで（200レスポンスが返ってくるまで）ログイン画面に留まる
        let role: UserRole;
        // loginUserTypeをスコープ外で定義（後で使用するため）
        const loginUserType = localStorage.getItem('loginUserType') as UserRole;
        
        try {
          role = await fetchUserRole();
          log('✅ Role fetched from API:', role);
          
          // APIから正常に認可情報を取得できた場合のみ認証状態を設定
          setIsAuthenticated(true);
          setUserRole(role);
          setUserId(user.userId);
          // ユーザー名をローカルストレージから取得
          const userInfoStr = localStorage.getItem('userInfo');
          if (userInfoStr) {
            try {
              const userInfo = JSON.parse(userInfoStr);
              setUserName(userInfo.requestedBy || null);
            } catch (e) {
              setUserName(null);
            }
          }
          
          // ローカルストレージにも保存（後方互換性のため）
          localStorage.setItem('auth', JSON.stringify({ role, userId: user.userId, email: userEmail }));
          
          // Googleログインの場合、loginUserTypeが設定されていない可能性があるため、確認して保持する
          // 注意: Googleログイン後のコールバック時、IndexedDB、Cookie、sessionStorage、localStorageの順で確認
          // リダイレクト時にストレージがクリアされる可能性があるため、IndexedDBから優先的に取得
          let currentLoginUserType: string | null = null;
          
          // 1. IndexedDBから取得（最も永続的）
          try {
            currentLoginUserType = await getLoginUserType();
            if (currentLoginUserType) {
              log('🔍 checkAuthStatus - Found loginUserType in IndexedDB after successful authentication:', currentLoginUserType);
            }
          } catch (error) {
            log('⚠️ checkAuthStatus - Failed to get loginUserType from IndexedDB:', error);
          }
          
          // 2. IndexedDBにない場合は、sessionStorageから取得
          if (!currentLoginUserType) {
            currentLoginUserType = sessionStorage.getItem('loginUserType');
          }
          
          // 3. sessionStorageにもない場合はlocalStorageから取得
          if (!currentLoginUserType) {
            currentLoginUserType = localStorage.getItem('loginUserType');
          }
          
          // 4. localStorageにもない場合は、Cookieから取得（リダイレクト後にストレージがクリアされている可能性があるため）
          if (!currentLoginUserType) {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'loginUserType') {
                currentLoginUserType = decodeURIComponent(value);
                log('🔍 checkAuthStatus - Found loginUserType in cookie after successful authentication, restoring to storage:', currentLoginUserType);
                // Cookieから取得した値をsessionStorageとlocalStorageに復元
                sessionStorage.setItem('loginUserType', currentLoginUserType);
                localStorage.setItem('loginUserType', currentLoginUserType);
                break;
              }
            }
          }
          
          let currentGoogleLoginInProgress: string | null = null;
          
          // 1. IndexedDBから取得（最も永続的）
          try {
            const fromIndexedDB = await getGoogleLoginInProgress();
            if (fromIndexedDB) {
              currentGoogleLoginInProgress = 'true';
              log('🔍 checkAuthStatus - Found googleLoginInProgress in IndexedDB after successful authentication');
            }
          } catch (error) {
            log('⚠️ checkAuthStatus - Failed to get googleLoginInProgress from IndexedDB:', error);
          }
          
          // 2. IndexedDBにない場合は、sessionStorageから取得
          if (!currentGoogleLoginInProgress) {
            currentGoogleLoginInProgress = sessionStorage.getItem('googleLoginInProgress');
          }
          
          // 3. sessionStorageにもない場合はlocalStorageから取得
          if (!currentGoogleLoginInProgress) {
            currentGoogleLoginInProgress = localStorage.getItem('googleLoginInProgress');
          }
          
          // 4. localStorageにもない場合は、Cookieから取得
          if (!currentGoogleLoginInProgress) {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'googleLoginInProgress') {
                currentGoogleLoginInProgress = decodeURIComponent(value);
                log('🔍 checkAuthStatus - Found googleLoginInProgress in cookie after successful authentication, restoring to storage:', currentGoogleLoginInProgress);
                // Cookieから取得した値をsessionStorageとlocalStorageに復元
                sessionStorage.setItem('googleLoginInProgress', currentGoogleLoginInProgress);
                localStorage.setItem('googleLoginInProgress', currentGoogleLoginInProgress);
                break;
              }
            }
          }
          
          // 5. すべてのストレージにない場合、URLパラメータにcodeがある場合はOAuthコールバックと判断
          if (!currentGoogleLoginInProgress && urlParams.get('code')) {
            log('🔍 checkAuthStatus - Detected OAuth callback (code parameter found), setting googleLoginInProgress flag');
            currentGoogleLoginInProgress = 'true';
            await saveGoogleLoginInProgress();
            // フォールバックとして、Cookie、sessionStorage、localStorageにも保存
            const expirationDate = new Date();
            expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
            document.cookie = `googleLoginInProgress=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
            sessionStorage.setItem('googleLoginInProgress', 'true');
            localStorage.setItem('googleLoginInProgress', 'true');
          }
          
          log('🔍 checkAuthStatus - Checking loginUserType after successful authentication:', {
            loginUserType: currentLoginUserType,
            googleLoginInProgress: currentGoogleLoginInProgress,
            role: role,
            isLoginPage: isLoginPage,
            cookie: {
              loginUserType: document.cookie.split(';').find(c => c.trim().startsWith('loginUserType='))?.split('=')[1] || null,
              googleLoginInProgress: document.cookie.split(';').find(c => c.trim().startsWith('googleLoginInProgress='))?.split('=')[1] || null
            },
            sessionStorage: {
              loginUserType: sessionStorage.getItem('loginUserType'),
              googleLoginInProgress: sessionStorage.getItem('googleLoginInProgress')
            },
            localStorage: {
              loginUserType: localStorage.getItem('loginUserType'),
              googleLoginInProgress: localStorage.getItem('googleLoginInProgress')
            }
          });
          
          // 権限チェック: 管理者画面にログインしようとしたが、実際の権限が従業員の場合
          if (currentLoginUserType === 'admin' && role === 'employee') {
            log('⚠️ Permission mismatch: User tried to login as admin but actual role is employee');
            
            // スナックバーでエラーメッセージを表示
            const errorMessage = 'アクセス権限がありません。管理者権限が必要です。';
            setSnackbar({ message: errorMessage, type: 'error' });
            setTimeout(() => setSnackbar(null), 5000);
            
            // permissionDeniedを設定
            localStorage.setItem('permissionDenied', JSON.stringify({
              message: errorMessage,
              attemptedPath: window.location.pathname
            }));
            
            // loginUserTypeを削除して管理者画面への遷移を防ぐ
            localStorage.removeItem('loginUserType');
            sessionStorage.removeItem('loginUserType');
            // Cookieからも削除
            document.cookie = 'loginUserType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            // Cognitoの認証情報を削除（ログアウト）
            // ログアウトを確実に完了させるため、複数回試行する
            let signOutSuccess = false;
            for (let i = 0; i < 3; i++) {
              try {
                await signOut();
                log('🔐 Cognito認証情報を削除しました（管理者権限不足のため）');
                signOutSuccess = true;
                // ログアウト完了を待つため、少し待機
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
              } catch (signOutError) {
                logError(`Failed to sign out after permission denied (attempt ${i + 1}/3):`, signOutError);
                if (i < 2) {
                  // リトライ前に少し待機
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
            
            if (!signOutSuccess) {
              logError('⚠️ Failed to sign out after 3 attempts. User may need to manually clear browser data.');
            }
            
            // 認証状態をリセット
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setUserName(null);
            localStorage.removeItem('auth');
            localStorage.removeItem('userInfo');
            setIsLoading(false);
            return; // 早期リターンしてログイン画面に留まる
          }
          
          // Googleログインの場合、loginUserTypeが設定されていない場合は、エラーログを出力（デバッグ用）
          if (currentGoogleLoginInProgress === 'true' && !currentLoginUserType) {
            log('⚠️ WARNING: Google login in progress but loginUserType not found in cookie, localStorage, or sessionStorage!');
            log('⚠️ This may cause incorrect redirection. Will use userRole for redirection:', role);
          }
          
          // 注意: loginUserTypeは、App.tsxやLogin.tsxでリダイレクト処理が完了するまで保持する必要がある
          // そのため、ここでは削除しない（App.tsxやLogin.tsxで削除される）
          // Googleログインの場合、App.tsxでloginUserTypeを確認してリダイレクト先を決定する
          // 通常ログインの場合、Login.tsxでpendingLoginを使用してリダイレクト先を決定する
        } catch (err: any) {
          // 401エラー（認証エラー）の場合は、認証状態をリセットしてログイン画面に戻る
          // その他のエラーも同様に処理（認証が成功するまでログイン画面に留まる）
          const isUnauthorized = err?.status === 401 || err?.isUnauthorized || err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('Failed to fetch');
          const isForbidden = err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Forbidden') || err?.message?.includes('アクセス権限');
          
          if (isUnauthorized) {
            log('❌ Unauthorized (401) or CORS error - Resetting auth state and staying on login screen');
          } else if (isForbidden) {
            log('❌ Forbidden (403) - Access denied, resetting auth state and staying on login screen');
          } else {
            logError('❌ Failed to fetch role from API - staying on login screen:', err);
          }
          
          // エラーメッセージをスナックバーで表示（初回起動時は表示しない）
          // ただし、明示的なログイン試行後のエラーのみ表示
          const shouldShowError = loginUserType || localStorage.getItem('auth'); // ログイン試行がある場合のみ表示
          if (shouldShowError) {
            const errorMessage = translateApiError(err);
            setSnackbar({ message: errorMessage, type: 'error' });
            setTimeout(() => setSnackbar(null), 5000);
          }
          
          // 認証成功後に認可APIでエラーが発生した場合、Cognitoでは認証済みの状態のままになってしまうため、
          // Cognitoの認証情報を削除（ログアウト）して再ログイン可能にする
          // ログアウトを確実に完了させるため、複数回試行する
          let signOutSuccess = false;
          for (let i = 0; i < 3; i++) {
            try {
              await signOut();
              log('🔐 Cognito認証情報を削除しました（認可APIエラーのため）');
              signOutSuccess = true;
              // ログアウト完了を待つため、少し待機
              await new Promise(resolve => setTimeout(resolve, 500));
              break;
            } catch (signOutError) {
              logError(`Failed to sign out after authorization error (attempt ${i + 1}/3):`, signOutError);
              if (i < 2) {
                // リトライ前に少し待機
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          if (!signOutSuccess) {
            logError('⚠️ Failed to sign out after 3 attempts. User may need to manually clear browser data.');
          }
          
          // 認証状態をリセットしてログイン画面に留まる
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserName(null);
          localStorage.removeItem('auth');
          localStorage.removeItem('userInfo');
          // Googleログイン中の場合は、googleLoginInProgressフラグを削除（エラー時は処理を中断）
          if (localStorage.getItem('googleLoginInProgress') === 'true') {
            localStorage.removeItem('googleLoginInProgress');
            log('ℹ️ Google login error - removed googleLoginInProgress flag');
          }
          // フォールバックを使用しない（認証が成功するまで待つ）
          setIsLoading(false);
          
          // エラーを再スローして、呼び出し元（login関数など）で検知できるようにする
          // forceCheckがtrueの場合（ログイン試行時）は例外をスロー
          if (forceCheck) {
            throw err; // ログイン試行時は例外をスローしてエラーを伝播
          }
          return; // 初期ロード時など、forceCheckがfalseの場合は早期リターン
        }
      } else {
        log('❌ No user or session found');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        localStorage.removeItem('auth');
      }
    } catch (error: any) {
      // ユーザーが認証されていない場合のエラー処理
      // UserUnAuthenticatedExceptionは既に上で処理されているため、ここではその他のエラーのみを処理
      if (error?.name === 'UserUnAuthenticatedException' || error?.message?.includes('User needs to be authenticated')) {
        // 既に処理済みの場合は何もしない（エラーログを出力しない）
        log('ℹ️ User is not authenticated');
      } else {
        // その他のエラーのみログに出力
        logError('❌ Error checking auth status:', error);
      }
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('auth');
      localStorage.removeItem('userInfo');
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserRole, isAuthenticated, userRole]);

  useEffect(() => {
    // Amplifyの設定（まだ設定されていない場合）
    const configureAmplify = async (): Promise<boolean> => {
      try {
        const environment = getAmplifyEnvironment();
        const configPath = getAmplifyConfigPath();
        
        log(`🔧 Loading Amplify config for environment: ${environment}`);
        log(`📁 Config path: ${configPath}`);
        
        // fetch APIを使用してamplify_outputs.jsonを読み込む
        // publicディレクトリから読み込み（scripts/copy-amplify-outputs.jsでコピーされる）
        // これにより、ファイルが存在しない場合でもビルドエラーが発生しません
        // リトライロジックを追加（開発サーバーが起動していない場合の対策）
        let response: Response | null = null;
        let lastError: Error | null = null;
        const maxRetries = 3;
        const retryDelay = 1000; // 1秒
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            response = await fetch(configPath);
            if (response.ok) {
              break; // 成功したらループを抜ける
            }
          } catch (error: any) {
            lastError = error;
            if (i < maxRetries - 1) {
              // 最後の試行でない場合は待機してリトライ
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              log(`⚠️ Retrying to load Amplify config (attempt ${i + 2}/${maxRetries})...`);
            }
          }
        }
        
        if (!response || !response.ok) {
          const statusText = response?.statusText || 'Unknown error';
          const statusCode = response?.status || 0;
          throw lastError || new Error(`Failed to load config after ${maxRetries} attempts. Status: ${statusCode} ${statusText}, Path: ${configPath}`);
        }
        
        if (response.ok) {
          const outputs = await response.json();
          log('📋 Loaded Amplify outputs:', outputs);
          
          // 必要な設定が含まれているか確認
          if (!outputs.auth) {
            throw new Error('Amplify outputs does not contain auth configuration');
          }
          
          // 環境変数で上書き可能な設定を適用
          // 1. APIエンドポイントの上書き（環境変数が設定されている場合）
          // すべての環境でVITE_API_ENDPOINTを使用
          const envApiEndpoint = import.meta.env.VITE_API_ENDPOINT;
          
          if (envApiEndpoint) {
            if (!outputs.custom) {
              outputs.custom = {};
            }
            outputs.custom.apiEndpoint = envApiEndpoint;
            log('✅ API endpoint overridden from environment variable:', envApiEndpoint);
          }
          
          // 2. OAuthリダイレクトURLの上書き（環境変数が設定されている場合）
          const envRedirectSignIn = import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN;
          const envRedirectSignOut = import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT;
          
          if (envRedirectSignIn && outputs.auth?.oauth) {
            outputs.auth.oauth.redirect_sign_in_uri = envRedirectSignIn.split(',').map((url: string) => url.trim());
            log('✅ OAuth redirect_sign_in_uri overridden from environment variable:', outputs.auth.oauth.redirect_sign_in_uri);
          }
          
          if (envRedirectSignOut && outputs.auth?.oauth) {
            outputs.auth.oauth.redirect_sign_out_uri = envRedirectSignOut.split(',').map((url: string) => url.trim());
            log('✅ OAuth redirect_sign_out_uri overridden from environment variable:', outputs.auth.oauth.redirect_sign_out_uri);
          }
          
          Amplify.configure(outputs);
          
          // APIエンドポイントを設定（amplify_outputs.jsonから取得）
          // 優先順位: 環境変数 > outputs.api.url > outputs.custom.apiEndpoint
          if (envApiEndpoint) {
            setAmplifyApiEndpoint(envApiEndpoint);
            log('✅ API endpoint set from environment variable:', envApiEndpoint);
          } else if (outputs.api?.url) {
            setAmplifyApiEndpoint(outputs.api.url);
            log('✅ API endpoint set from amplify_outputs.json (api.url):', outputs.api.url);
          } else if (outputs.custom?.apiEndpoint && outputs.custom.apiEndpoint !== 'YOUR_PRODUCTION_API_GATEWAY_ENDPOINT') {
            setAmplifyApiEndpoint(outputs.custom.apiEndpoint);
            log('✅ API endpoint set from amplify_outputs.json (custom.apiEndpoint):', outputs.custom.apiEndpoint);
          } else {
            warn('⚠️ API endpoint not found in amplify_outputs.json. Using environment variable or default.');
            if (outputs.custom?.apiEndpoint === 'YOUR_PRODUCTION_API_GATEWAY_ENDPOINT') {
              warn('⚠️ custom.apiEndpoint is still set to placeholder value. Please update amplify_outputs.production.json or set VITE_API_ENDPOINT_PRODUCTION environment variable.');
            }
          }
          
          setIsAmplifyConfigured(true);
          log(`✓ Amplify configured successfully for ${environment} environment`);
          return true;
        } else {
          throw new Error(`Config file not found: ${configPath} (status: ${response.status})`);
        }
      } catch (error: any) {
        // 設定ファイルが存在しない場合は警告を表示
        const environment = getAmplifyEnvironment();
        const configPath = getAmplifyConfigPath();
        logError('❌ Failed to load Amplify config:', error);
        logError(`Environment: ${environment}, Config path: ${configPath}`);
        logError(`Error details: ${error?.message || error}`);
        
        if (environment === 'development') {
          warn("amplify_outputs.json not found. Please run 'npx ampx sandbox' to generate it.");
          warn("Authentication features will not work until amplify_outputs.json is generated.");
        } else {
          logError("amplify_outputs.production.json not found or failed to load.");
          logError("Please ensure the file exists in the public directory and is included in the build output.");
          logError("Check the browser console for the exact error message.");
          logError("Authentication features will not work until production config is set up.");
        }
        setIsAmplifyConfigured(false);
        return false;
      }
    };

    // Amplifyの設定と認証状態の確認
    configureAmplify().then((configured) => {
      if (configured) {
        // OAuthコールバック時（URLパラメータにcodeがある場合）は、ログイン画面でもcheckAuthStatusを呼ぶ
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.get('code');
        const isOAuthCallback = hasCode !== null;
        
        // ログイン画面の場合は、API通信をスキップ（ログインボタン押下時のみAPI通信）
        // ただし、OAuthコールバック時は例外（forceCheck=trueで呼ぶ）
        // それ以外の画面の場合は、認証状態を確認（既に認証されている場合の復元）
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/login' || currentPath === '/';
        
        if (!isLoginPage || isOAuthCallback) {
          // ログイン画面以外、またはOAuthコールバック時は、認証状態を確認
          // 少し待機してからチェック（Amplifyの初期化を確実に完了させるため）
          setTimeout(() => {
            checkAuthStatus(isOAuthCallback);
          }, 100);
        } else {
          // ログイン画面でOAuthコールバックでない場合
          // ブラウザの戻るボタンで戻った場合でも、APIから認証情報を取得しない
          // ログイン画面では、ユーザーが明示的にログイン操作を行うまで、認証状態を復元しない
          // これにより、ブラウザの戻るボタンで戻った場合でも、ログイン画面が表示される
          log('ℹ️ Login page detected - skipping initial auth check (user may want to switch role)');
          setIsLoading(false);
        }
      } else {
        // 設定に失敗した場合は読み込みを終了
        setIsLoading(false);
      }
    }).catch((error) => {
      logError('Failed to configure Amplify:', error);
      setIsLoading(false);
    });

    // Amplify Hubで認証イベントを監視
    const hubListenerCancelToken = Hub.listen('auth', ({ payload }) => {
      log('🔔 Auth Hub event:', payload.event, payload);
      switch (payload.event) {
        case 'signedIn':
          log('✅ User signed in event received');
          // ログイン試行が検出された場合は、ログイン画面でもAPI通信を実行
          checkAuthStatus(true);
          break;
        case 'signedOut':
          log('👋 User signed out');
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserName(null);
          localStorage.removeItem('auth');
          localStorage.removeItem('userInfo');
          break;
        case 'tokenRefresh':
          log('🔄 Token refreshed');
          // トークンリフレッシュ時に認可情報を更新
          setIsApiLoading(true);
          refreshAuthorization()
            .then((authInfo) => {
              log('✅ Authorization refreshed:', authInfo);
              
              // ユーザー名を設定（姓・名の順序で表示）
              // API仕様: firstName = 苗字（姓）, lastName = 名前（名）
              // 表示時は日本語の慣習に従って「姓 名」の順序で結合する（例: "山田 太郎"）
              // つまり `${firstName} ${lastName}` の順序で表示する
              const displayName = `${authInfo.firstName} ${authInfo.lastName}`;
              
              // ローカルストレージに認可情報を保存
              const userInfo = {
                employeeId: authInfo.employeeId,
                requestedBy: displayName, // 姓・名の順序で結合した表示名
                role: authInfo.role,
                email: authInfo.email
              };
              localStorage.setItem('userInfo', JSON.stringify(userInfo));
              
              // 認証状態も更新
              setIsAuthenticated(true);
              setUserRole(authInfo.role as UserRole);
              setUserName(displayName);
              
              // ローカルストレージのauthも更新
              const authData = localStorage.getItem('auth');
              if (authData) {
                try {
                  const parsed = JSON.parse(authData);
                  parsed.role = authInfo.role;
                  localStorage.setItem('auth', JSON.stringify(parsed));
                } catch (e) {
                  // エラー時は無視
                }
              }
            })
            .catch((error) => {
              logError('Failed to refresh authorization:', error);
              // エラーメッセージをスナックバーで表示
              const errorMessage = translateApiError(error);
              setSnackbar({ message: errorMessage, type: 'error' });
              setTimeout(() => setSnackbar(null), 5000);
              // エラー時は既存の認証状態を維持（checkAuthStatusは呼ばない）
            })
            .finally(() => {
              setIsApiLoading(false);
            });
          break;
        case 'tokenRefresh_failure':
          logError('❌ Token refresh failed:', payload.data);
          break;
        default:
          log('📢 Other auth event:', payload.event);
          break;
      }
    });

    return () => {
      hubListenerCancelToken();
    };
  }, [checkAuthStatus]);

  const login = async (id: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      // Amplifyが設定されていない場合、設定が完了するまで待機（最大5秒）
      if (!isAmplifyConfigured) {
        log('⏳ Waiting for Amplify configuration...');
        const maxWaitTime = 5000; // 5秒
        const checkInterval = 100; // 100msごとにチェック
        let waitedTime = 0;
        
        while (!isAmplifyConfigured && waitedTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitedTime += checkInterval;
        }
        
        if (!isAmplifyConfigured) {
          const environment = getAmplifyEnvironment();
          const configPath = getAmplifyConfigPath();
          logError(`❌ Amplify configuration timeout after ${maxWaitTime}ms`);
          logError(`Environment: ${environment}, Config path: ${configPath}`);
          if (environment === 'production') {
            logError('Please ensure amplify_outputs.production.json exists in the public directory and is included in the build output.');
          } else {
            logError('Please run npx ampx sandbox to generate amplify_outputs.json.');
          }
          setSnackbar({ 
            message: environment === 'production' 
              ? '設定ファイルの読み込みに失敗しました。ページをリロードしてください。'
              : 'Amplify設定が完了していません。設定ファイルを確認してください。', 
            type: 'error' 
          });
          setTimeout(() => setSnackbar(null), 5000);
          return false;
        }
      }

      // signInを呼ぶ前にloginUserTypeを設定（Hubリスナーが先に反応する可能性があるため）
      // 注意: Login.tsxのhandleSubmitでも設定されているが、念のためここでも設定
      if (role) {
        localStorage.setItem('loginUserType', role);
      }

      let signInResult;
      try {
        signInResult = await signIn({ username: id, password });
      } catch (signInError: any) {
        // UserAlreadyAuthenticatedExceptionの場合は、ログアウトしてから再度試行
        if (signInError?.name === 'UserAlreadyAuthenticatedException' || signInError?.message?.includes('already a signed in user')) {
          log('既にログイン済みのユーザーが検出されました。ログアウトしてから再度試行します。');
          try {
            await signOut();
            // ログアウト後に少し待機（状態の更新を待つ）
            await new Promise(resolve => setTimeout(resolve, 500));
            // 再度ログインを試行
            signInResult = await signIn({ username: id, password });
          } catch (retryError) {
            logError('ログアウト後の再ログインに失敗しました:', retryError);
            throw new Error('既にログイン済みのユーザーです。ページを再読み込みしてください。');
          }
        } else {
          // その他のエラーは再スロー
          throw signInError;
        }
      }
      
      const { isSignedIn } = signInResult;
      
      if (isSignedIn) {
        // 認証状態を再チェック
        // checkAuthStatus内でloginUserTypeが優先的に使用される
        // ログイン試行が検出された場合は、ログイン画面でもAPI通信を実行
        // forceCheck=trueで呼び出すことで、エラー時には例外がスローされる
        try {
          await checkAuthStatus(true);
          
          // checkAuthStatusが成功した場合（例外がスローされなかった場合）
          // 認証状態とuserRoleは正しく設定されているはず
          // 少し待機してから状態を確認（状態更新の完了を待つ）
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return true;
        } catch (authError: any) {
          // checkAuthStatus内でエラーが発生した場合（権限エラー、401、403など）
          // 認証成功後に認可APIでエラーが発生した場合、Cognitoでは認証済みの状態のままになってしまうため、
          // Cognitoの認証情報を削除（ログアウト）して再ログイン可能にする
          logError('Authorization check failed after login:', authError);
          localStorage.removeItem('loginUserType');
          
          // Cognitoの認証情報を削除（ログアウト）
          // ログアウトを確実に完了させるため、複数回試行する
          let signOutSuccess = false;
          for (let i = 0; i < 3; i++) {
            try {
              await signOut();
              log('🔐 Cognito認証情報を削除しました（認可APIエラーのため）');
              signOutSuccess = true;
              // ログアウト完了を待つため、少し待機
              await new Promise(resolve => setTimeout(resolve, 500));
              break;
            } catch (signOutError) {
              logError(`Failed to sign out after authorization error (attempt ${i + 1}/3):`, signOutError);
              if (i < 2) {
                // リトライ前に少し待機
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          if (!signOutSuccess) {
            logError('⚠️ Failed to sign out after 3 attempts. User may need to manually clear browser data.');
          }
          
          // 認証状態を確実にリセット（checkAuthStatus内でもリセットされているが、念のため）
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setUserName(null);
          localStorage.removeItem('auth');
          localStorage.removeItem('userInfo');
          
          // エラーメッセージをスナックバーで表示（既にcheckAuthStatus内で表示されている可能性があるが、念のため）
          const errorMessage = translateApiError(authError);
          setSnackbar({ message: errorMessage, type: 'error' });
          setTimeout(() => setSnackbar(null), 5000);
          
          return false;
        }
      } else {
        // ログイン失敗時はloginUserTypeを削除
        localStorage.removeItem('loginUserType');
        return false;
      }
    } catch (err) {
      // エラー時もloginUserTypeを削除
      localStorage.removeItem('loginUserType');
      logError('Login error:', err);
      // UserAlreadyAuthenticatedExceptionなどのエラーはLogin.tsxでスナックバーに表示するため、再スロー
      throw err;
    }
  };

  const signInWithGoogle = async (userType?: 'admin' | 'employee') => {
    // Amplifyが設定されていない場合、エラーをスロー
    if (!isAmplifyConfigured) {
      const error = new Error(
        'Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。\n' +
        'npx ampx sandboxを実行してAmplifyサンドボックスを起動してください。'
      );
      logError('Google sign-in error:', error);
      throw error;
    }

    try {
      // userTypeが渡されている場合は、IndexedDB、Cookie、sessionStorage、localStorageに保存
      // リダイレクト後にストレージがクリアされる可能性があるため、IndexedDBを優先的に使用
      if (userType) {
        log('🔐 signInWithGoogle - userType received:', userType);
        
        // IndexedDBに保存（最も永続的）
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
        
        log('🔐 signInWithGoogle - Saved loginUserType to IndexedDB, cookie, sessionStorage, and localStorage');
      }
      
      // 既にログインしている場合は、まずログアウトしてから再度ログイン
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          log('既にログイン済みのユーザーが検出されました。ログアウトしてから再度ログインします。');
          await signOut();
          // ログアウト後に少し待機（状態の更新を待つ）
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (notSignedInError) {
        // ログインしていない場合は正常な状態
        log('ユーザーはログインしていません。通常のログインフローを続行します。');
      }
      
      // AWS Amplify Gen 2では、signInWithRedirectを使用してGoogleログインを開始
      // リダイレクト前に、loginUserTypeをURLパラメータとして追加
      // これにより、コールバック後にURLパラメータから取得できる
      if (userType) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('loginUserType', userType);
        // URLを更新（ただし、実際のリダイレクトはAmplifyが行うため、これは補助的なもの）
        // 実際には、AmplifyのリダイレクトURLにこのパラメータが含まれることはないため、
        // 別の方法で保持する必要がある
        log('🔐 signInWithGoogle - loginUserType will be preserved via storage:', userType);
      }
      
      log('🔐 signInWithGoogle - Starting signInWithRedirect');
      await signInWithRedirect({ provider: 'Google' });
    } catch (err: any) {
      logError('Google sign-in error:', err);
      
      // UserAlreadyAuthenticatedExceptionの場合は、ログアウトしてから再度試行
      if (err?.name === 'UserAlreadyAuthenticatedException' || err?.message?.includes('already a signed in user')) {
        log('既にログイン済みのユーザーが検出されました。ログアウトしてから再度試行します。');
        try {
          await signOut();
          // ログアウト後に少し待機（状態の更新を待つ）
          await new Promise(resolve => setTimeout(resolve, 500));
          // userTypeが設定されている場合は、再度保存（Cookie、sessionStorage、localStorage）
          if (userType) {
            const expirationDate = new Date();
            expirationDate.setTime(expirationDate.getTime() + 60 * 60 * 1000); // 1時間
            document.cookie = `loginUserType=${encodeURIComponent(userType)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
            
            sessionStorage.setItem('loginUserType', userType);
            sessionStorage.setItem('googleLoginInProgress', 'true');
            localStorage.setItem('loginUserType', userType);
            localStorage.setItem('googleLoginInProgress', 'true');
          }
          // 再度ログインを試行
          await signInWithRedirect({ provider: 'Google' });
          return; // 成功した場合はここで終了
        } catch (retryError) {
          logError('ログアウト後の再ログインに失敗しました:', retryError);
          throw new Error('既にログイン済みのユーザーです。ページを再読み込みしてください。');
        }
      }
      
      // より詳細なエラーメッセージを提供
      if (err instanceof Error && err.message.includes('UserPool')) {
        const detailedError = new Error(
          '認証ユーザープールが設定されていません。\n' +
          '1. AWS認証情報を設定してください: npx ampx configure profile\n' +
          '2. Amplifyサンドボックスを起動してください: npx ampx sandbox\n' +
          '3. amplify_outputs.jsonが生成されることを確認してください'
        );
        throw detailedError;
      }
      
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('auth');
      localStorage.removeItem('userInfo');
    } catch (err) {
      logError('Logout error:', err);
      // エラーが発生してもローカル状態はクリア
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('auth');
      localStorage.removeItem('userInfo');
    }
  };

  /**
   * パスワード再設定コードを送信する関数
   * @param username ユーザー名（メールアドレス）
   * @returns 次のステップ情報
   */
  const requestPasswordReset = async (username: string): Promise<{ nextStep: string }> => {
    if (!isAmplifyConfigured) {
      throw new Error('Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。');
    }

        try {
          const output = await resetPassword({ username });
          log('✅ Password reset code sent:', output);
          const resetStep = output.nextStep?.resetPasswordStep || 'CONFIRM_RESET_PASSWORD';
          return { nextStep: resetStep as string };
        } catch (err) {
          logError('Password reset request error:', err);
          throw err;
    }
  };

  /**
   * パスワード再設定コードを確認して新しいパスワードを設定する関数
   * @param username ユーザー名（メールアドレス）
   * @param confirmationCode 確認コード（メールで送信されたコード）
   * @param newPassword 新しいパスワード
   */
  const confirmPasswordReset = async (
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> => {
    if (!isAmplifyConfigured) {
      throw new Error('Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。');
    }

        try {
          await confirmResetPassword({
            username,
            confirmationCode,
            newPassword,
          });
          log('✅ Password reset confirmed successfully');
        } catch (err) {
          logError('Password reset confirmation error:', err);
          throw err;
    }
  };

  /**
   * ユーザー登録を行う関数
   * @param username ユーザー名（メールアドレス）
   * @param password パスワード
   * @returns ユーザーIDと次のステップ情報
   */
  const handleSignUp = async (username: string, password: string): Promise<{ userId: string; nextStep: string }> => {
    if (!isAmplifyConfigured) {
      throw new Error('Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。');
    }

    try {
      const { userId, nextStep } = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email: username, // メールアドレスを属性として設定
          },
        },
      });
        log('✅ User signup successful:', { userId, nextStep });
      // サインアップ後のステップを返す（常にCONFIRM_SIGN_UPを返す）
      if (!userId) {
        throw new Error('ユーザーIDが取得できませんでした');
      }
      return { userId: userId as string, nextStep: 'CONFIRM_SIGN_UP' };
    } catch (error) {
        logError('Signup error:', error);
      throw error;
    }
  };

  /**
   * サインアップの確認コードを確認する関数
   * @param username ユーザー名（メールアドレス）
   * @param confirmationCode 確認コード（メールで送信されたコード）
   */
  const handleConfirmSignUp = async (username: string, confirmationCode: string): Promise<void> => {
    if (!isAmplifyConfigured) {
      throw new Error('Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。');
    }

    try {
      const { isSignUpComplete } = await confirmSignUp({
        username,
        confirmationCode,
      });
          log('✅ Signup confirmation successful:', { isSignUpComplete });
      if (!isSignUpComplete) {
        throw new Error('サインアップが完了しませんでした。');
      }
    } catch (error) {
          logError('Signup confirmation error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      userId,
      userName,
      isLoading, 
      login, 
      signInWithGoogle, 
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      signUp: handleSignUp,
      confirmSignUp: handleConfirmSignUp
    }}>
      <ProgressBar isLoading={isApiLoading} />
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
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

