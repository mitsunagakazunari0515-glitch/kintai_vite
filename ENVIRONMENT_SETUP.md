# 環境分離設定ガイド

このプロジェクトでは、開発環境と本番環境で異なるCognitoユーザープールを使用します。

## 環境設定

### 開発環境（デフォルト）
- **ユーザープール**: Amplifyサンドボックスが自動生成
- **設定ファイル**: `amplify_outputs.json`
- **生成方法**: `npx ampx sandbox` を実行すると自動生成

### 本番環境
- **ユーザープール**: `a1kintai-webapp` (ID: `ap-northeast-1_BEqjl3q81`)
- **設定ファイル**: `amplify_outputs.production.json`
- **設定方法**: 手動で作成（下記参照）

## セットアップ手順

### 1. 開発環境のセットアップ

```bash
# Amplifyサンドボックスを起動（開発環境用ユーザープールが自動生成される）
npx ampx sandbox
```

これにより `amplify_outputs.json` が生成されます。

### 2. 本番環境のセットアップ

#### 2.1. 既存のユーザープールにGoogle OAuthを設定

1. [AWS Cognitoコンソール](https://console.aws.amazon.com/cognito/home)にアクセス
2. ユーザープール `a1kintai-webapp` を選択
3. 「サインインエクスペリエンス」タブ → 「フェデレーション」セクション
4. 「IDプロバイダー」で「Google」を追加
   - クライアントID: `23427567528-i1gimvv0up7u0jnotuq8u9fav89qjj7c`
   - クライアントシークレット: `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`
5. 「アプリクライアント」でGoogleを有効化
6. コールバックURLを設定（Google Cloud Consoleでも設定が必要）

#### 2.2. 本番環境設定ファイルの作成

1. `amplify_outputs.production.json.template` をコピーして `amplify_outputs.production.json` を作成

```bash
cp amplify_outputs.production.json.template amplify_outputs.production.json
```

2. 既存のユーザープールの情報を取得して設定：

```bash
# AWS CLIを使用してユーザープール情報を取得
aws cognito-idp describe-user-pool \
  --user-pool-id ap-northeast-1_BEqjl3q81 \
  --region ap-northeast-1

# アプリクライアント情報を取得
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-northeast-1_BEqjl3q81 \
  --client-id YOUR_CLIENT_ID \
  --region ap-northeast-1
```

3. `amplify_outputs.production.json` を編集して以下の情報を設定：
   - `user_pool_client_id`: アプリクライアントID
   - `identity_pool_id`: アイデンティティプールID（使用している場合）
   - `oauth.domain`: Cognitoドメイン
   - `data.url`: AppSyncエンドポイント（使用している場合）
   - `data.api_key`: APIキー（使用している場合）

## 環境の切り替え

### 方法1: 環境変数を使用（推奨）

`.env` ファイルを作成：

```bash
# 開発環境
VITE_AMPLIFY_ENV=development

# 本番環境
VITE_AMPLIFY_ENV=production
```

### 方法2: ビルド時に指定

```bash
# 開発環境でビルド
VITE_AMPLIFY_ENV=development npm run build

# 本番環境でビルド
VITE_AMPLIFY_ENV=production npm run build
```

## 注意事項

- `.env` ファイルは `.gitignore` に追加してください（機密情報を含む可能性があるため）
- `amplify_outputs.production.json` には本番環境の機密情報が含まれるため、`.gitignore` に追加することを推奨
- 開発環境と本番環境で異なるGoogle OAuthリダイレクトURIが必要な場合があります

## トラブルシューティング

### 本番環境で認証が失敗する場合

1. `amplify_outputs.production.json` が正しく設定されているか確認
2. 既存のユーザープールにGoogle OAuthが設定されているか確認
3. Google Cloud Consoleで正しいリダイレクトURIが設定されているか確認

### 開発環境で認証が失敗する場合

1. `npx ampx sandbox` が実行されているか確認
2. `amplify_outputs.json` が生成されているか確認
3. ブラウザのコンソールでエラーログを確認

