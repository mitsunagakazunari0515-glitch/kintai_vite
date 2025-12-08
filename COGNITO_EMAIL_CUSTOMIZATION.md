# Cognito メール内容のカスタマイズ方法

AWS Cognitoでは、ユーザーに送信されるメールの内容をカスタマイズできます。

## カスタマイズ可能なメールタイプ

以下のメールタイプをカスタマイズできます：

1. **サインアップ確認メール** (Verification email)
   - 新規登録時に送信される確認コード

2. **パスワードリセットメール** (Forgot password email)
   - パスワード再設定時に送信される確認コード

3. **招待メール** (Invitation email)
   - 管理者がユーザーを招待する場合

4. **メール変更確認メール** (Email change verification)

## カスタマイズ方法

### 方法1: AWSコンソールから直接編集（推奨）

1. **AWSコンソールにログイン**
   - https://console.aws.amazon.com/cognito/ にアクセス

2. **ユーザープールを選択**
   - 開発環境: Amplifyサンドボックスで生成されたUser Pool
   - 本番環境: `a1kintai-webapp` User Pool

3. **メッセージのカスタマイズ**
   - 左メニューから「メッセージのカスタマイズ」を選択
   - または「サインインエクスペリエンス」→「メッセージのカスタマイズ」

4. **メールタイプを選択して編集**
   - 「認証コード」タブを選択
   - 「件名」と「メッセージ本文」を編集

### 方法2: Lambdaトリガーを使用した動的カスタマイズ

より高度なカスタマイズが必要な場合（ユーザー属性に基づく動的な内容変更など）は、Lambdaトリガーを使用します。

#### 設定手順

1. **Lambda関数を作成**
   ```typescript
   // amplify/functions/customEmailTrigger/index.ts
   import { Context } from 'aws-lambda';

   export const handler = async (event: any, context: Context) => {
     // メールタイプに応じて内容をカスタマイズ
     if (event.triggerSource === 'CustomMessage_SignUp') {
       // サインアップ確認メール
       event.response.emailSubject = 'A・1勤怠管理システム - アカウント確認';
       event.response.emailMessage = `
         <html>
           <body>
             <h2>A・1勤怠管理システムへのご登録ありがとうございます</h2>
             <p>以下のコードを入力してアカウントを確認してください:</p>
             <p style="font-size: 24px; font-weight: bold;">{####}</p>
             <p>このコードは10分間有効です。</p>
           </body>
         </html>
       `;
     } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
       // パスワードリセットメール
       event.response.emailSubject = 'A・1勤怠管理システム - パスワードリセット';
       event.response.emailMessage = `
         <html>
           <body>
             <h2>パスワード再設定のお手続き</h2>
             <p>以下のコードを入力してパスワードを再設定してください:</p>
             <p style="font-size: 24px; font-weight: bold;">{####}</p>
             <p>このコードは10分間有効です。</p>
             <p>この操作をリクエストしていない場合は、このメールを無視してください。</p>
           </body>
         </html>
       `;
     }

     return event;
   };
   ```

2. **Amplify AuthリソースにLambdaトリガーを追加**
   ```typescript
   // amplify/auth/resource.ts
   import { defineAuth } from '@aws-amplify/backend';
   import { customMessage } from '../functions/customEmailTrigger/resource';

   export const auth = defineAuth({
     loginWith: {
       email: true,
       // ... 既存の設定
     },
     triggers: {
       customMessage, // Lambdaトリガーを追加
     },
   });
   ```

### 方法3: 本番環境（既存User Pool）での設定

本番環境の`a1kintai-webapp` User Poolでは、AWSコンソールから直接編集する方法が最も簡単です。

1. **AWSコンソールでUser Poolを開く**
   - User Pool ID: `ap-northeast-1_BEqjl3q81`

2. **メッセージのカスタマイズ**
   - 「サインインエクスペリエンス」→「メッセージのカスタマイズ」→「認証コード」

3. **メールテンプレートを編集**
   - HTML形式で編集可能
   - `{####}` プレースホルダーが確認コードに置き換えられます

## メールテンプレートのプレースホルダー

以下のプレースホルダーが使用できます：

- `{####}`: 確認コード（6桁の数字）
- `{username}`: ユーザー名
- `{####}`: 確認コード（代替形式）

## サンプルメールテンプレート

### サインアップ確認メール

**件名:**
```
A・1勤怠管理システム - アカウント確認コード
```

**本文:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #8b5a2b;">A・1勤怠管理システム</h2>
    <p>ご登録ありがとうございます。</p>
    <p>以下の確認コードを入力してアカウントを有効化してください：</p>
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8b5a2b; margin: 0;">
        {####}
      </p>
    </div>
    <p style="color: #666; font-size: 14px;">
      このコードは10分間有効です。<br>
      この操作をリクエストしていない場合は、このメールを無視してください。
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #999; font-size: 12px;">
      A・1勤怠管理システム
    </p>
  </div>
</body>
</html>
```

### パスワードリセットメール

**件名:**
```
A・1勤怠管理システム - パスワード再設定コード
```

**本文:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #8b5a2b;">パスワード再設定のお手続き</h2>
    <p>パスワード再設定のリクエストを受け付けました。</p>
    <p>以下の確認コードを入力してパスワードを再設定してください：</p>
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8b5a2b; margin: 0;">
        {####}
      </p>
    </div>
    <p style="color: #666; font-size: 14px;">
      このコードは10分間有効です。<br>
      この操作をリクエストしていない場合は、このメールを無視してください。
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #999; font-size: 12px;">
      A・1勤怠管理システム
    </p>
  </div>
</body>
</html>
```

## 注意事項

1. **開発環境**: Amplifyサンドボックスで生成されたUser Poolは、デプロイ時にリセットされる可能性があります。カスタマイズは一時的なものです。

2. **本番環境**: 既存のUser Pool（`a1kintai-webapp`）での設定は永続的です。

3. **メール送信**: Cognitoのメール送信には、SES（Simple Email Service）の設定が必要な場合があります。サンドボックス環境では自動的に設定されますが、本番環境では確認が必要です。

4. **プレビュー**: AWSコンソールでメールテンプレートのプレビューを確認できます。

## 参考リンク

- [AWS Cognito メッセージのカスタマイズ](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/user-pool-lambda-custom-message.html)
- [Amplify Gen 2 Auth ドキュメント](https://docs.amplify.aws/gen2/build-a-backend/auth/)

