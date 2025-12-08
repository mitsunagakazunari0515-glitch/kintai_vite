import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession, signInWithRedirect, fetchUserAttributes, resetPassword, confirmResetPassword, signUp, confirmSignUp } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Amplify } from 'aws-amplify';
import { getAmplifyConfigPath, getAmplifyEnvironment } from '../config/amplifyConfig';
import { log, error as logError, warn } from '../utils/logger';

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
  /** ログイン処理を行う関数（メール/パスワード）。 */
  login: (id: string, password: string, role: UserRole) => Promise<boolean>;
  /** Googleログイン処理を行う関数。 */
  signInWithGoogle: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState<boolean>(true); // 初期状態は読み込み中
  const [isAmplifyConfigured, setIsAmplifyConfigured] = useState<boolean>(false); // Amplifyが設定されているかどうか

  // ユーザー情報を取得してロールを判定する関数（useCallbackでメモ化）
  const fetchUserRole = useCallback(async (userEmail: string): Promise<UserRole> => {
    try {
      // ここでは簡易的にメールアドレスで判定
      // 実際の実装では、Cognitoのユーザー属性やDynamoDBなどからロールを取得
      // 管理者のメールアドレスのパターンに基づいて判定（例: @admin.example.com）
      // または、Cognitoのユーザー属性から'custom:role'を取得
      
      // デモ用: メールアドレスに基づいてロールを判定
      // 実際には、Cognitoのユーザー属性から取得することを推奨
      if (userEmail.includes('@admin.') || userEmail.includes('admin@')) {
        return 'admin';
      }
      return 'employee';
    } catch (err) {
      logError('Failed to fetch user role:', err);
      return 'employee'; // デフォルトは従業員
    }
  }, []);

  // 認証状態をチェックする関数（useCallbackでメモ化）
  const checkAuthStatus = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      // Identity Poolのエラーを無視して、User Poolの認証のみを使用
      let session = null;
      try {
        session = await fetchAuthSession();
      } catch (sessionError) {
        // Identity Poolのエラーは無視（User Poolの認証のみを使用する場合）
        log('⚠ Identity Pool session fetch failed (using User Pool only):', sessionError);
        // User Poolの認証のみを使用する場合は、sessionがなくても続行
      }
      
      log('🔍 Checking auth status...');
      log('User:', user);
      log('Session:', session);
      
      // User Poolの認証が成功していれば続行（Identity Poolはオプション）
      if (user) {
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
        if (!userEmail && session?.tokens?.idToken) {
          try {
            // IDトークンからメールアドレスをデコード
            const idToken = session.tokens.idToken;
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
        
        const role = await fetchUserRole(userEmail);
        
        setIsAuthenticated(true);
        setUserRole(role);
        setUserId(user.userId);
        
        // ローカルストレージにも保存（後方互換性のため）
        localStorage.setItem('auth', JSON.stringify({ role, userId: user.userId, email: userEmail }));
      } else {
        log('❌ No user or session found');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        localStorage.removeItem('auth');
      }
    } catch (error) {
      // ユーザーが認証されていない
      logError('❌ Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('auth');
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserRole]);

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
        const response = await fetch(configPath);
        
        if (response.ok) {
          const outputs = await response.json();
          log('📋 Loaded Amplify outputs:', outputs);
          Amplify.configure(outputs);
          setIsAmplifyConfigured(true);
          log(`✓ Amplify configured successfully for ${environment} environment`);
          return true;
        } else {
          throw new Error(`Config file not found: ${configPath} (status: ${response.status})`);
        }
      } catch (error) {
        // 設定ファイルが存在しない場合は警告を表示
        const environment = getAmplifyEnvironment();
        logError('❌ Failed to load Amplify config:', error);
        if (environment === 'development') {
          warn("amplify_outputs.json not found. Please run 'npx ampx sandbox' to generate it.");
          warn("Authentication features will not work until amplify_outputs.json is generated.");
        } else {
          logError("amplify_outputs.production.json not found. Please create production config file.");
          logError("Authentication features will not work until production config is set up.");
        }
        setIsAmplifyConfigured(false);
        return false;
      }
    };

    // Amplifyの設定と認証状態の確認
    configureAmplify().then((configured) => {
      if (configured) {
        // Amplify設定が完了してから認証状態を確認
        // 少し待機してからチェック（Amplifyの初期化を確実に完了させるため）
        setTimeout(() => {
          checkAuthStatus();
        }, 100);
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
          checkAuthStatus();
          break;
        case 'signedOut':
          log('👋 User signed out');
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          localStorage.removeItem('auth');
          break;
        case 'tokenRefresh':
          log('🔄 Token refreshed');
          checkAuthStatus();
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

  const login = async (id: string, password: string, _role: UserRole): Promise<boolean> => {
    try {
      // Amplifyが設定されていない場合、エラーを返す
      if (!isAmplifyConfigured) {
        logError('Amplify is not configured. Please run npx ampx sandbox.');
        return false;
      }

      const { isSignedIn } = await signIn({ username: id, password });
      
      if (isSignedIn) {
        // 認証状態を再チェック
        await checkAuthStatus();
        return true;
      }
      return false;
    } catch (err) {
      logError('Login error:', err);
      return false;
    }
  };

  const signInWithGoogle = async () => {
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
      // AWS Amplify Gen 2では、signInWithRedirectを使用してGoogleログインを開始
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      logError('Google sign-in error:', err);
      
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
    } catch (err) {
      logError('Logout error:', err);
      // エラーが発生してもローカル状態はクリア
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('auth');
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
      isLoading, 
      login, 
      signInWithGoogle, 
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      signUp: handleSignUp,
      confirmSignUp: handleConfirmSignUp
    }}>
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

