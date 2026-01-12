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
    
    // エラーコード別のメッセージ（ERROR_LIST.mdに基づく）
    switch (errorCode) {
      // 400 Bad Request - 共通エラー
      case 'INVALID_EMPLOYEE_ID':
        return '従業員IDが正しくありません';
      case 'INVALID_DATE_FORMAT': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Invalid date format: (.+)/);
        if (match) {
          return `日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）: ${match[1]}`;
        }
        return '日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      }
      case 'INVALID_TIME_FORMAT': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Invalid time format: (.+)/);
        if (match) {
          return `時刻の形式が正しくありません（HH:MM:SS形式で入力してください）: ${match[1]}`;
        }
        return '時刻の形式が正しくありません（HH:MM:SS形式で入力してください）';
      }
      case 'MISSING_REQUIRED_FIELD': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Missing required field: (.+)/);
        if (match) {
          return `${match[1]}は必須項目です`;
        }
        return '必須項目が不足しています';
      }
      case 'INVALID_EMAIL_FORMAT':
        return 'メールアドレスの形式が正しくありません';
      case 'EMAIL_TOO_LONG':
        return 'メールアドレスは255文字以内で入力してください';
      case 'INVALID_YEAR_MONTH_FORMAT':
        return '年月の形式が正しくありません';
      case 'INVALID_YEAR_MONTH_VALUE':
        return '年月の値が正しくありません';
      case 'INVALID_WORK_DATE_FORMAT':
        return '勤務日の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      case 'INVALID_WORK_DATE':
        return '勤務日が正しくありません';
      case 'INVALID_START_DATE_FORMAT':
        return '開始日の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      case 'INVALID_END_DATE_FORMAT':
        return '終了日の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      case 'END_DATE_BEFORE_START_DATE':
        return '終了日は開始日以降の日付を指定してください';
      case 'EMPLOYEE_ID_REQUIRED':
        return '従業員IDを指定してください';
      case 'INVALID_APPLICATION_TYPE':
        return '申請種別が正しくありません';
      case 'INVALID_APPROVER_ID':
        return '承認者IDが正しくありません';
      case 'INVALID_CURRENT_EMPLOYEE_ID':
        return '現在の従業員IDが正しくありません';
      case 'MISSING_REQUESTED_BY_HEADER':
        return '更新者情報（X-Requested-Byヘッダー）を指定してください';
      case 'UPDATED_BY_TOO_LONG':
        return '更新者は100文字以内で入力してください';

      // 従業員API固有
      case 'MISSING_FIRST_NAME':
        return '名は必須項目です';
      case 'MISSING_LAST_NAME':
        return '姓は必須項目です';
      case 'FIRST_NAME_TOO_LONG':
        return '名は50文字以内で入力してください';
      case 'LAST_NAME_TOO_LONG':
        return '姓は50文字以内で入力してください';
      case 'INVALID_EMPLOYMENT_TYPE':
        return '雇用形態はFULL_TIMEまたはPART_TIMEを指定してください';
      case 'MISSING_JOIN_DATE':
        return '入社日は必須項目です';
      case 'INVALID_JOIN_DATE_FORMAT':
        return '日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      case 'INVALID_LEAVE_DATE_FORMAT':
        return '退職日の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      case 'LEAVE_DATE_BEFORE_JOIN_DATE':
        return '退職日は入社日より後の日付を指定してください';
      case 'MISSING_BASE_SALARY':
        return '基本給は必須項目です';
      case 'INVALID_BASE_SALARY':
        return '基本給は0以上の値を指定してください';
      case 'INVALID_ALLOWANCE_MASTER_ID': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Invalid allowance master ID: (.+)/);
        if (match) {
          return `手当マスタIDが正しくありません: ${match[1]}`;
        }
        return '手当マスタIDが正しくありません';
      }
      case 'ALLOWANCE_MASTER_NOT_FOUND': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Allowance master with ID (.+) not found/);
        if (match) {
          return `指定された手当マスタが見つかりません: ${match[1]}`;
        }
        return '指定された手当マスタが見つかりません';
      }
      case 'INVALID_DEFAULT_BREAK_TIME':
        return 'デフォルト休憩時間は0以上の値を指定してください';
      case 'INVALID_PAID_LEAVE_GRANT_DATE_FORMAT': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Invalid paid leave grant date format \(YYYY-MM-DD\): (.+)/);
        if (match) {
          return `有給付与日の形式が正しくありません（YYYY-MM-DD形式で入力してください）: ${match[1]}`;
        }
        return '有給付与日の形式が正しくありません（YYYY-MM-DD形式で入力してください）';
      }
      case 'INVALID_PAID_LEAVE_DAYS':
        return '有給日数は1以上の値を指定してください';

      // 勤怠API固有
      case 'CANNOT_START_BREAK_ALREADY_CLOCKED_OUT':
        return '退勤済みのため休憩を開始できません';

      // 休暇申請API固有
      case 'MISSING_REASON':
        return '理由は必須項目です';
      case 'INSUFFICIENT_PAID_LEAVE_BALANCE': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Insufficient paid leave balance \(remaining: ([\d.]+) days, requested: ([\d.]+) days\)/);
        if (match) {
          const remaining = match[1];
          const requested = match[2];
          return `有給残日数が不足しています（残り: ${remaining}日、申請: ${requested}日）`;
        }
        return '有給残日数が不足しています';
      }
      case 'CANNOT_UPDATE_APPROVED_REQUEST':
        return '承認済みの申請は更新できません';
      case 'CANNOT_DELETE_APPROVED_REQUEST':
        return '承認済みの申請は削除できません';

      // 申請API固有
      case 'INVALID_ATTENDANCE_REQUEST_ID':
        return '打刻修正申請IDが正しくありません';
      case 'CANNOT_APPROVE_REJECTED_OR_DELETED_REQUEST':
        return '却下済みまたは削除済みの申請は承認できません';
      case 'CANNOT_REJECT_REJECTED_OR_DELETED_REQUEST':
        return '却下済みまたは削除済みの申請は却下できません';

      // 給与明細API固有
      case 'INVALID_PAYROLL_RECORD_ID':
        return '給与明細IDが正しくありません';

      // 休暇申請API / 申請API共通
      case 'INVALID_LEAVE_REQUEST_ID':
        return '休暇申請IDが正しくありません';

      // 401 Unauthorized - 共通
      case 'AUTHENTICATION_REQUIRED':
        return '認証が必要です。ログインしてください';
      case 'INVALID_TOKEN':
        return 'トークンが無効です。再ログインしてください';
      case 'AUTHENTICATION_FAILED':
        return '認証に失敗しました。再ログインしてください';

      // 認証API固有
      case 'INVALID_TOKEN_FORMAT':
        return 'トークンの形式が正しくありません';
      case 'EMAIL_NOT_FOUND_IN_TOKEN':
        return 'トークンにメールアドレスが含まれていません';

      // 403 Forbidden - 共通
      case 'ACCESS_FORBIDDEN':
        return 'この操作を実行する権限がありません';
      case 'ADMIN_PRIVILEGES_REQUIRED':
        return 'この操作には管理者権限が必要です';
      case 'USER_ID_NOT_FOUND':
        return 'ユーザーIDが見つかりません';

      // 認証API固有
      case 'EMPLOYEE_NOT_ACTIVE':
        return '在籍していない従業員はログインできません';

      // 勤怠API固有
      case 'CANNOT_VIEW_OTHER_ATTENDANCE_RECORDS':
        return '自分の勤怠記録のみ閲覧できます';
      case 'CANNOT_UPDATE_OTHER_ATTENDANCE_RECORDS':
        return '自分の勤怠記録のみ更新できます';

      // 休暇申請API固有
      case 'CANNOT_VIEW_OTHER_LEAVE_REQUESTS':
        return '他の従業員の休暇申請を閲覧する権限がありません';
      case 'CANNOT_UPDATE_OTHER_REQUESTS':
        return '自分の申請のみ更新できます';
      case 'CANNOT_DELETE_OTHER_REQUESTS':
        return '自分の申請のみ削除できます';

      // 給与明細API固有
      case 'CANNOT_VIEW_OTHER_PAYROLL_RECORDS':
        return '他の従業員の給与明細を閲覧する権限がありません';
      case 'CANNOT_VIEW_THIS_PAYROLL_RECORD':
        return 'この給与明細を閲覧する権限がありません';
      case 'CANNOT_UPDATE_THIS_PAYROLL_RECORD_MEMO':
        return 'この給与明細のメモを更新する権限がありません';

      // 404 Not Found - 共通
      case 'RESOURCE_NOT_FOUND':
        return 'リソースが見つかりません';
      case 'EMPLOYEE_NOT_FOUND':
        return '従業員が見つかりません';
      case 'EMPLOYEE_WITH_ID_NOT_FOUND': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Employee with ID (.+) not found/);
        if (match) {
          return `従業員ID ${match[1]} が見つかりません`;
        }
        return '従業員が見つかりません';
      }

      // 勤怠API固有
      case 'ATTENDANCE_RECORD_NOT_FOUND':
        return '勤怠記録が見つかりません';
      case 'ATTENDANCE_RECORD_NOT_FOUND_FOR_EMPLOYEE_AND_DATE': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Attendance record not found for employee (.+) on date (.+)/);
        if (match) {
          return `従業員ID ${match[1]} の ${match[2]} の勤怠記録が見つかりません`;
        }
        return '勤怠記録が見つかりません';
      }
      case 'CLOCK_IN_NOT_RECORDED':
        return '出勤打刻が記録されていません';
      case 'CANNOT_START_BREAK_CLOCK_IN_NOT_RECORDED':
        return '出勤打刻が記録されていないため休憩を開始できません';
      case 'NO_ACTIVE_BREAK_RECORD_FOUND':
        return '有効な休憩記録が見つかりません';

      // 休暇申請API固有
      case 'LEAVE_REQUEST_WITH_ID_NOT_FOUND': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Leave request with ID (.+) not found/);
        if (match) {
          return `休暇申請ID ${match[1]} が見つかりません`;
        }
        return '休暇申請が見つかりません';
      }

      // 申請API固有
      case 'ATTENDANCE_REQUEST_WITH_ID_NOT_FOUND': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Attendance request with ID (.+) not found/);
        if (match) {
          return `打刻修正申請ID ${match[1]} が見つかりません`;
        }
        return '打刻修正申請が見つかりません';
      }

      // 給与明細API固有
      case 'PAYROLL_RECORD_WITH_ID_NOT_FOUND': {
        const errorMessage = apiError.error?.message || apiError.message || '';
        const match = errorMessage.match(/Payroll record with ID (.+) not found/);
        if (match) {
          return `給与明細ID ${match[1]} が見つかりません`;
        }
        return '給与明細が見つかりません';
      }

      // 409 Conflict - 共通
      case 'RESOURCE_CONFLICT':
        return 'リソースの競合が発生しました';

      // 従業員API固有
      case 'EMAIL_ALREADY_EXISTS':
        return 'このメールアドレスは既に登録されています';

      // 勤怠API固有
      case 'CLOCK_IN_ALREADY_RECORDED':
        return 'この日付の出勤打刻は既に記録されています';
      case 'CLOCK_OUT_ALREADY_RECORDED':
        return 'この日付の退勤打刻は既に記録されています';
      case 'BREAK_ALREADY_ENDED':
        return 'この休憩は既に終了しています';

      // 休暇申請API固有
      case 'LEAVE_REQUEST_ALREADY_EXISTS':
        return '指定期間の休暇申請は既に存在します';

      // 申請API固有
      case 'REQUEST_ALREADY_APPROVED':
        return 'この申請は既に承認済みです';

      // 給与明細API固有
      case 'PAYROLL_RECORD_ALREADY_EXISTS':
        return '指定期間の給与明細は既に存在します';

      // 500 Internal Server Error - 共通
      case 'INTERNAL_SERVER_ERROR':
        return 'サーバーでエラーが発生しました。しばらくしてから再度お試しください';
      case 'DATABASE_ERROR':
        return 'データベースでエラーが発生しました。管理者にお問い合わせください';
      case 'TRANSACTION_ERROR':
        return 'トランザクション処理中にエラーが発生しました。管理者にお問い合わせください';

      // 勤怠API固有
      case 'CLOCK_IN_TIME_NOT_AVAILABLE':
        return '出勤時刻が取得できません。管理者にお問い合わせください';

      // 後方互換性のための既存のエラーコード
      case 'UNAUTHORIZED':
        return '認証に失敗しました。再度ログインしてください。';
      case 'FORBIDDEN':
        return 'アクセス権限がありません。';
      case 'NOT_FOUND':
        return 'リソースが見つかりませんでした。';
      case 'VALIDATION_ERROR':
        // バリデーションエラーの場合は詳細メッセージを返す
        // error.messageを優先的に使用
        let errorMessage = apiError.error?.message || apiError.message || '';
        
        // 有給休暇残日数不足のエラーメッセージを日本語化
        if (errorMessage.includes('Insufficient paid leave balance')) {
          const match = errorMessage.match(/remaining: ([\d.]+) days, requested: ([\d.]+) days/);
          if (match) {
            const remaining = match[1];
            const requested = match[2];
            return `有給残日数が不足しています（残り: ${remaining}日、申請: ${requested}日）`;
          }
          return '有給残日数が不足しています';
        }
        
        // その他のエラーメッセージも日本語化
        if (errorMessage.includes('Invalid employee ID')) {
          return '従業員IDが正しくありません';
        }
        if (errorMessage.includes('Invalid application type')) {
          return '申請種別が正しくありません';
        }
        
        // エラーメッセージがある場合は返す（英語のままでも可）
        if (errorMessage) {
          return errorMessage;
        }
        
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

