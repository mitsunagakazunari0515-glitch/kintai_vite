# 本番環境Cognito動作確認ガイド

本番環境（既存のユーザープール `a1kintai-webapp`）でのCognito認証の動作確認手順です。

## 前提条件

- 既存のユーザープール `a1kintai-webapp` (ID: `ap-northeast-1_BEqjl3q81`) が存在すること
- Google OAuthが既存のユーザープールに設定されていること

## 手順

### ステップ1: 既存のユーザープールにGoogle OAuthが設定されているか確認

1. [AWS Cognitoコンソール](https://console.aws.amazon.com/cognito/home)にアクセス
2. ユーザープール `a1kintai-webapp` を選択
3. 「サインインエクスペリエンス」タブを開く
4. 「フェデレーション」セクションで「IDプロバイダー」を確認
5. Googleが設定されていることを確認
   - 設定されていない場合: [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) を参照して設定

### ステップ2: Google Cloud ConsoleのリダイレクトURIを確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. OAuth 2.0クライアントIDを開く
5. 「承認済みのリダイレクト URI」に以下が設定されているか確認：

```
https://ap-northeast-1beqjl3q81.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse
```

**重要**: 本番環境のCognitoドメインは `ap-northeast-1beqjl3q81.auth.ap-northeast-1.amazoncognito.com` です。

### ステップ3: 本番環境設定ファイルの確認

`amplify_outputs.production.json` の設定を確認：

```json
{
  "auth": {
    "user_pool_id": "ap-northeast-1_BEqjl3q81",
    "user_pool_client_id": "19m7ms3tcrebrmqehv7ilsglpk",
    "oauth": {
      "domain": "https://ap-northeast-1beqjl3q81.auth.ap-northeast-1.amazoncognito.com"
    }
  }
}
```

### ステップ4: 環境変数の設定

プロジェクトルートに `.env.production` ファイルを作成：

```bash
# 本番環境用
VITE_AMPLIFY_ENV=production

# 既存のAPI Gatewayエンドポイント（必要に応じて）
VITE_API_ENDPOINT_PRODUCTION=https://your-prod-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
```

または、`.env.development` ファイルを作成（開発環境用）：

```bash
# 開発環境用
VITE_AMPLIFY_ENV=development
VITE_API_ENDPOINT=
```

### ステップ5: 設定ファイルをpublicディレクトリにコピー

```bash
# 本番環境設定ファイルをpublicディレクトリにコピー
cp amplify_outputs.production.json public/amplify_outputs.production.json
```

または、`scripts/copy-amplify-outputs.js` が自動的にコピーします。

### ステップ6: アプリケーションの起動

#### 開発環境で起動
```bash
npm run dev
```

#### 本番環境で起動
```bash
npm run prod
```

### ステップ7: ブラウザで動作確認

1. ブラウザで `http://localhost:5173/login` にアクセス
2. ブラウザの開発者ツール（F12）でコンソールを開く
3. 以下のログが表示されることを確認：
   ```
   🔧 Loading Amplify config for environment: production
   📁 Config path: /amplify_outputs.production.json
   ✓ Amplify configured successfully for production environment
   ```

### ステップ8: Googleログインのテスト

1. ログイン画面で「Googleでログイン」ボタンをクリック
2. Googleの認証画面にリダイレクトされることを確認
3. Googleアカウントでログイン
4. 本番環境のCognitoユーザープールにユーザーが作成されることを確認
5. アプリケーションにリダイレクトされてログインできることを確認

### ステップ9: ユーザーの確認

1. [AWS Cognitoコンソール](https://console.aws.amazon.com/cognito/home)で確認
2. ユーザープール `a1kintai-webapp` → 「ユーザー」タブ
3. Googleログインで作成されたユーザーが表示されることを確認
4. ユーザー名は `google_` から始まる形式（例: `google_101360055108738682312`）

## トラブルシューティング

### エラー: "Auth UserPool not configured"

- `.env` ファイルで `VITE_AMPLIFY_ENV=production` が設定されているか確認
- `public/amplify_outputs.production.json` が存在するか確認
- ブラウザをリロード

### エラー: "redirect_uri mismatch"

- Google Cloud ConsoleのリダイレクトURIを確認
- 本番環境のCognitoドメイン: `ap-northeast-1beqjl3q81.auth.ap-northeast-1.amazoncognito.com`
- URIの形式: `https://ap-northeast-1beqjl3q81.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse`

### ユーザーが作成されない

- Cognitoコンソールでユーザープールの設定を確認
- Google IDプロバイダーが正しく設定されているか確認
- ブラウザのコンソールでエラーログを確認

### ログイン後、画面が切り替わらない

- ブラウザのコンソールでエラーログを確認
- 認証状態が正しく取得できているか確認
- ユーザーロールの判定ロジックを確認

## 確認チェックリスト

- [ ] 既存のユーザープールにGoogle OAuthが設定されている
- [ ] Google Cloud Consoleに正しいリダイレクトURIが設定されている
- [ ] `amplify_outputs.production.json` が正しく設定されている
- [ ] `.env` ファイルで `VITE_AMPLIFY_ENV=production` が設定されている
- [ ] `public/amplify_outputs.production.json` が存在する
- [ ] アプリケーションが本番環境設定を読み込んでいる（コンソールログで確認）
- [ ] Googleログインが正常に動作する
- [ ] Cognitoユーザープールにユーザーが作成される
- [ ] ログイン後、適切な画面にリダイレクトされる

## 本番環境と開発環境の切り替え

### npmスクリプトで切り替え（推奨）

```bash
# 開発環境で起動（Amplifyサンドボックスのユーザープールを使用）
npm run dev

# 本番環境で起動（既存のユーザープール a1kintai-webapp を使用）
npm run prod
```

### 環境変数ファイル

Viteは`--mode`フラグに応じて自動的に環境変数ファイルを読み込みます：

- 開発環境（`npm run dev`）: `.env.development`が使用される
- 本番環境（`npm run prod`）: `.env.production`が使用される

