# Google OAuth リダイレクトURI設定ガイド

## 重要な設定

AWS Cognitoを使用する場合、Google Cloud Consoleには**Cognitoのホストドメイン**をリダイレクトURIとして設定する必要があります。

## 現在のCognitoドメイン

```
e5c3c0d8b62e98165a6d.auth.ap-northeast-1.amazoncognito.com
```

## 設定手順

### 1. Google Cloud Consoleで設定するリダイレクトURI

Google Cloud ConsoleのOAuth 2.0クライアント設定で、以下のURIを**承認済みのリダイレクト URI**に追加してください：

```
https://e5c3c0d8b62e98165a6d.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse
```

### 2. 設定場所

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. 既存のOAuth 2.0クライアントIDをクリック（または新規作成）
5. 「承認済みのリダイレクト URI」セクションに上記のURIを追加
6. 「保存」をクリック

### 3. 注意事項

- **重要**: アプリケーション自体のURL（`http://localhost:5173/`など）は追加**しないでください**
- CognitoがGoogleとアプリケーションの間の仲介役となるため、リダイレクトURIは必ずCognitoドメインにする必要があります
- URIは完全一致する必要があります（末尾のスラッシュも含めて）

## フロー

1. ユーザーが「Googleでログイン」をクリック
2. アプリケーション → AWS Cognito（`/oauth2/authorize`）
3. Cognito → Google（リダイレクトURI: `https://{cognito-domain}/oauth2/idpresponse`）
4. Google → Cognito（`/oauth2/idpresponse`でコールバック）
5. Cognito → アプリケーション（`http://localhost:5173/`にリダイレクト）

## トラブルシューティング

### エラー 400: redirect_uri mismatch

- Google Cloud Consoleに正しいCognito URIが設定されているか確認
- URIが完全一致しているか確認（プロトコル、ドメイン、パス）
- 変更後、数分待ってから再試行

### Cognitoドメインが変更された場合

- `amplify_outputs.json`の`domain`値を確認
- Google Cloud ConsoleのリダイレクトURIを更新

