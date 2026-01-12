# CORSエラー修正まとめ

## 現在の状況

- **使用中のAPI**: 既存の`a1kintai-APIHandler`（別リポジトリ）
- **API Gateway**: 既存の`a1kintaiAPI`（REST API、ID: `tv731cev0j`）
- **問題**: CORSヘッダーが重複しており、`Access-Control-Allow-Origin`に同じ値が2回含まれている

## エラー内容

```
Access-Control-Allow-Origin header contains multiple values 'http://localhost:5173, http://localhost:5173'
```

## 解決方法

### 既存Lambda関数（別リポジトリ）での修正

既存のLambda関数（`a1kintai-APIHandler`）はExpressアプリケーションとして動作しています。  
以下のいずれかの方法で修正してください：

#### 方法1: corsミドルウェアのみを使用（推奨）

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// corsミドルウェアのみでCORSヘッダーを設定（1箇所のみ）
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Device-Info',
    'X-Requested-By',
    'X-Employee-Id'
  ]
}));

// ❌ 手動でのCORSヘッダー設定を削除してください
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', ...); // 削除
// });
```

#### 方法2: 手動ヘッダー設定のみを使用

```typescript
import express from 'express';

const app = express();

// CORSヘッダーを1箇所のみで設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// OPTIONSリクエスト（CORS preflight）を早期リターン
app.options('*', (req, res) => {
  res.sendStatus(200);
});
```

**重要**: `cors`ミドルウェアと手動ヘッダー設定を併用しないでください。

## 確認事項

既存Lambda関数のコードで以下を検索してください：

1. `import cors from 'cors';` または `const cors = require('cors');`
2. `app.use(cors(...))` - corsミドルウェアの使用箇所
3. `res.header('Access-Control-Allow-Origin'` - 手動でのヘッダー設定
4. `res.setHeader('Access-Control-Allow-Origin'` - 手動でのヘッダー設定

**修正ポイント**: CORSヘッダーの設定を**1箇所のみ**に統一してください。

## 日本語エンコード・デコード

HTTPヘッダーに日本語を含む場合は、Base64エンコードが必要です。

詳細は [`docs/JAPANESE_ENCODING_RULES.md`](./JAPANESE_ENCODING_RULES.md) を参照してください。

## 関連ドキュメント

### 既存Lambda関数の修正
- [既存Lambda関数の修正方法（詳細）](./FIX_CORS_DUPLICATE_IN_EXISTING_LAMBDA.md) - 別リポジトリで修正する方法

### 既存API Gatewayの設定
- [API Gatewayログ設定](../amplify/API_GATEWAY_LOGGING_SETUP.md) - ログ設定
- [API Gateway CORS 401エラー修正](../amplify/API_GATEWAY_CORS_401_FIX.md) - 401エラー時のCORSヘッダー追加
- [API Gateway OPTIONS設定](../amplify/API_GATEWAY_CORS_OPTIONS_SETUP.md) - OPTIONSリクエストの設定
- [CognitoAuthorizer設定](../amplify/COGNITO_AUTHORIZER_SETUP.md) - CognitoAuthorizerの設定
- [Lambda環境変数設定](../amplify/LAMBDA_ENV_VARS_SETUP.md) - 環境変数の設定

### その他
- [日本語エンコード・デコードルール](./JAPANESE_ENCODING_RULES.md) - HTTPヘッダーに日本語を含む場合のエンコードルール

