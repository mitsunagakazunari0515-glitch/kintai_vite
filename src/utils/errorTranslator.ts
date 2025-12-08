/**
 * ファイル名: errorTranslator.ts
 * 説明: AWS Cognitoのエラーメッセージを日本語に翻訳するユーティリティ
 */

/**
 * AWS Cognitoのエラーメッセージを日本語に翻訳
 * @param error エラーオブジェクト
 * @returns 日本語のエラーメッセージ
 */
export const translateAuthError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
  }

  const errorMessage = error.message || '';
  const errorName = error.name || '';

  // エラー名を優先的にチェック（より正確）
  if (errorName === 'LimitExceededException' || errorMessage.includes('LimitExceededException') || 
      errorMessage.includes('Attempt limit exceeded') || errorMessage.includes('制限を超え') ||
      errorMessage.includes('試行回数の制限')) {
    return '試行回数の制限を超えました。しばらくしてからやり直してください。';
  }

  if (errorName === 'UserNotFoundException' || errorMessage.includes('UserNotFoundException') || 
      errorMessage.includes('ユーザーが見つかりません')) {
    return '指定されたユーザーが見つかりません。メールアドレスを確認してください。';
  }

  if (errorName === 'NotAuthorizedException' || errorMessage.includes('NotAuthorizedException') || 
      errorMessage.includes('認証に失敗')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }

  if (errorName === 'InvalidParameterException' || errorMessage.includes('InvalidParameterException') || 
      errorMessage.includes('無効なパラメータ')) {
    return 'メールアドレスの形式が正しくありません。';
  }

  if (errorName === 'CodeMismatchException' || errorMessage.includes('CodeMismatchException') || 
      errorMessage.includes('コードが一致しません')) {
    return '確認コードが正しくありません。もう一度確認してください。';
  }

  if (errorName === 'ExpiredCodeException' || errorMessage.includes('ExpiredCodeException') || 
      errorMessage.includes('コードの有効期限')) {
    return '確認コードの有効期限が切れています。再度コードを送信してください。';
  }

  if (errorName === 'UsernameExistsException' || errorMessage.includes('UsernameExistsException') || 
      errorMessage.includes('ユーザー名が既に存在')) {
    return 'このメールアドレスは既に登録されています。';
  }

  if (errorName === 'InvalidPasswordException' || errorMessage.includes('InvalidPasswordException') || 
      errorMessage.includes('無効なパスワード')) {
    return 'パスワードが要件を満たしていません。大文字、小文字、数字、記号を含む8文字以上のパスワードを設定してください。';
  }

  if (errorName === 'UserNotConfirmedException' || errorMessage.includes('UserNotConfirmedException') || 
      errorMessage.includes('ユーザーが確認されていません')) {
    return 'メールアドレスが確認されていません。確認コードを入力してください。';
  }

  if (errorName === 'PasswordResetRequiredException' || errorMessage.includes('PasswordResetRequiredException') || 
      errorMessage.includes('パスワードリセットが必要')) {
    return 'パスワードのリセットが必要です。パスワード再設定画面から設定してください。';
  }

  if (errorMessage.includes('Amplifyが設定されていません') || errorMessage.includes('Amplify is not configured')) {
    return 'Amplifyが設定されていません。amplify_outputs.jsonが見つかりません。\n' +
           'npx ampx sandboxを実行してAmplifyサンドボックスを起動してください。';
  }

  if (errorMessage.includes('認証ユーザープール') || errorMessage.includes('UserPool')) {
    return '認証ユーザープールが設定されていません。\n' +
           '1. AWS認証情報を設定してください: npx ampx configure profile\n' +
           '2. Amplifyサンドボックスを起動してください: npx ampx sandbox\n' +
           '3. amplify_outputs.jsonが生成されることを確認してください';
  }

  // デフォルトエラーメッセージ
  // エラーメッセージに英語が含まれている場合は、一般的な日本語メッセージを返す
  if (/[a-zA-Z]/.test(errorMessage) && !errorMessage.includes('Amplify') && !errorMessage.includes('UserPool')) {
    return 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
  }

  // 既に日本語の場合はそのまま返す
  return errorMessage;
};

