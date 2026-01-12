/**
 * APIエラーコードから日本語メッセージを生成する共通ユーティリティ
 * 全APIで共通のルールに基づいてエラーメッセージを返す
 */

/**
 * APIエラーレスポンスの型定義
 */
export interface ApiErrorResponse {
  statusCode?: number;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

/**
 * APIエラーコードから日本語メッセージを生成
 * @param error エラーオブジェクトまたはAPIエラーレスポンス
 * @returns 日本語のエラーメッセージ
 */
export const translateApiError = (error: unknown): string => {
  // Errorオブジェクトの場合
  if (error instanceof Error) {
    const errorMessage = error.message || '';
    
    // CORSエラーの場合
    if (errorMessage.includes('CORS') || errorMessage.includes('Access-Control-Allow-Origin') || errorMessage.includes('Failed to fetch')) {
      return 'サーバーとの通信に失敗しました。ネットワーク接続を確認してください。';
    }
    
    // HTTPステータスコードを含むエラーメッセージをチェック
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return '認証に失敗しました。再度ログインしてください。';
    }
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return 'アクセス権限がありません。';
    }
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return 'リソースが見つかりませんでした。';
    }
    if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
      return 'データの競合が発生しました。既に存在する可能性があります。';
    }
    if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
      return 'リクエストが不正です。入力内容を確認してください。';
    }
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      return 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
    }
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      return 'サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。';
    }
    
    // エラーメッセージが既に日本語の場合はそのまま返す
    if (!/[a-zA-Z]/.test(errorMessage) || errorMessage.includes('エラー') || errorMessage.includes('失敗')) {
      return errorMessage;
    }
    
    // デフォルトメッセージ
    return 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
  }

  // APIエラーレスポンスの場合
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorResponse;
    
    // エラーコードからメッセージを生成
    const errorCode = apiError.error?.code || '';
    const statusCode = apiError.statusCode || 0;
    
    // エラーコード別のメッセージ
    switch (errorCode) {
      case 'UNAUTHORIZED':
        return '認証に失敗しました。再度ログインしてください。';
      case 'FORBIDDEN':
        return 'アクセス権限がありません。';
      case 'NOT_FOUND':
        return 'リソースが見つかりませんでした。';
      case 'VALIDATION_ERROR':
        // バリデーションエラーの場合は詳細メッセージを返す
        if (apiError.error?.details) {
          const details = apiError.error.details;
          const firstError = Object.values(details)[0] as string[];
          if (firstError && firstError.length > 0) {
            return firstError[0];
          }
        }
        return '入力内容に誤りがあります。確認してください。';
      case 'CONFLICT':
        return 'データの競合が発生しました。既に存在する可能性があります。';
      case 'BAD_REQUEST':
        return 'リクエストが不正です。入力内容を確認してください。';
      case 'INTERNAL_SERVER_ERROR':
        return 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
      case 'SERVICE_UNAVAILABLE':
        return 'サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。';
      default:
        // エラーコードがない場合はHTTPステータスコードから判定
        if (statusCode === 401) {
          return '認証に失敗しました。再度ログインしてください。';
        }
        if (statusCode === 403) {
          return 'アクセス権限がありません。';
        }
        if (statusCode === 404) {
          return 'リソースが見つかりませんでした。';
        }
        if (statusCode === 409) {
          return 'データの競合が発生しました。既に存在する可能性があります。';
        }
        if (statusCode === 400) {
          return 'リクエストが不正です。入力内容を確認してください。';
        }
        if (statusCode >= 500) {
          return 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
        }
        
        // エラーメッセージがある場合はそれを使用
        if (apiError.message) {
          return apiError.message;
        }
        if (apiError.error?.message) {
          return apiError.error.message;
        }
        
        return 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
    }
  }

  // その他のエラー
  return 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
};

/**
 * APIレスポンスからエラー情報を抽出
 * @param response APIレスポンス
 * @returns エラー情報
 */
export const extractApiError = async (response: Response): Promise<ApiErrorResponse> => {
  try {
    const data = await response.json();
    return {
      statusCode: response.status,
      message: data.message,
      error: data.error,
    };
  } catch {
    // JSONパースに失敗した場合
    return {
      statusCode: response.status,
      message: `HTTP error! status: ${response.status}`,
    };
  }
};

