# 環境切り替えガイド

npmスクリプトを使用して、開発環境と本番環境を簡単に切り替えることができます。

## 利用可能なコマンド

### 開発サーバーの起動

```bash
# 開発環境（Amplifyサンドボックスのユーザープールを使用）
npm run dev

# 本番環境（既存のユーザープール a1kintai-webapp を使用）
npm run prod
```

### ビルド

```bash
# 開発環境でビルド
npm run build:dev

# 本番環境でビルド（デフォルト）
npm run build
```

## 環境変数ファイル

Viteは以下の環境変数ファイルを自動的に読み込みます：

- `.env.development` - 開発環境用（`npm run dev:development`時に使用）
- `.env.production` - 本番環境用（`npm run dev:production`時に使用）

### ファイルの作成

プロジェクトルートに以下のファイルを作成してください：

#### `.env.development`
```env
VITE_AMPLIFY_ENV=development
VITE_API_ENDPOINT=
```

#### `.env.production`
```env
VITE_AMPLIFY_ENV=production
VITE_API_ENDPOINT_PRODUCTION=https://your-prod-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
```

## 使用例

### 開発環境で動作確認

```bash
# 開発環境のAmplifyサンドボックスを使用
npm run dev
```

この場合：
- Amplify設定: `amplify_outputs.json`（サンドボックスが生成）
- Cognito: サンドボックスが作成したユーザープール
- API: 開発環境のAPI Gatewayエンドポイント（設定されている場合）

### 本番環境で動作確認

```bash
# 本番環境の既存ユーザープールを使用
npm run prod
```

この場合：
- Amplify設定: `amplify_outputs.production.json`
- Cognito: 既存のユーザープール `a1kintai-webapp`
- API: 本番環境のAPI Gatewayエンドポイント

## 確認方法

ブラウザのコンソールで、使用中の環境を確認できます：

```
🔧 Loading Amplify config for environment: development
```

または

```
🔧 Loading Amplify config for environment: production
```

## 注意事項

- `.env.development`と`.env.production`は`.gitignore`に含まれていません（テンプレートとしてコミット可能）
- 機密情報（APIキーなど）は`.env.local`ファイルに保存することを推奨
- `.env.local`は`.gitignore`に含まれているため、コミットされません

