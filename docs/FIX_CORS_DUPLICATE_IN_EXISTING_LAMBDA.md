# 既存Lambda関数（a1kintai-APIHandler）のCORSヘッダー重複修正ガイド

> **重要**: このプロジェクトでは既存のAPI（`a1kintai-APIHandler`）を使用しています。  
> 既存のLambda関数は別のリポジトリにあります。このドキュメントは、既存Lambda関数の修正方法を説明します。

## 問題

既存のLambda関数（`a1kintai-APIHandler`）でCORSヘッダーが重複しています。

エラーメッセージ：
```
Access-Control-Allow-Origin header contains multiple values 'http://localhost:5173, http://localhost:5173'
```

**原因**: Expressアプリケーション（serverless-express使用）で、CORSヘッダーが複数箇所で設定されています。
- `cors`ミドルウェアと手動ヘッダー設定の併用
- 複数のミドルウェアで同じヘッダーを設定
- ミドルウェアと各ルートハンドラーで設定

## 既存Lambda関数の特徴

CloudWatch Logsから、既存のLambda関数（`a1kintai-APIHandler`）の特徴：
- **`serverless-express`を使用**
- **Expressアプリケーションとして動作**
- **Prisma Clientを使用**
- **ミドルウェア（`[Middleware:Headers]`）を使用**
- **サービスクラス（`[Service:Auth]`）を使用**

**注意**: このLambda関数は別のリポジトリにあります。

## CORSヘッダー重複の原因（推定）

既存のLambda関数（Expressアプリケーション）で、以下のいずれかが原因と考えられます：

### パターン1: Expressのcorsミドルウェアと手動ヘッダー設定の重複

```typescript
// ❌ 問題のあるコード（推定）
import express from 'express';
import cors from 'cors';

const app = express();

// corsミドルウェアでCORSヘッダーを設定
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// さらに、レスポンスヘッダーでもCORSヘッダーを設定（重複！）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,...');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
```

### パターン2: 複数のミドルウェアでCORSヘッダーを設定

```typescript
// ❌ 問題のあるコード（推定）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // 重複！
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  next();
});
```

### パターン3: corsミドルウェアと各ルートでCORSヘッダーを設定

```typescript
// ❌ 問題のあるコード（推定）
app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/api/v1/auth/authorize', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // 重複！
  res.json({ ... });
});
```

## 修正方法

### 方法1: corsミドルウェアのみを使用（推奨）

**推奨**: Expressの`cors`ミドルウェアのみを使用し、手動でのヘッダー設定を削除します。

```typescript
// ✅ 正しいコード
import express from 'express';
import cors from 'cors';

const app = express();

// corsミドルウェアのみでCORSヘッダーを設定（1箇所のみ）
app.use(cors({
  origin: 'http://localhost:5173', // 開発環境
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

// 手動でのCORSヘッダー設定を削除
// ❌ app.use((req, res, next) => { res.header('Access-Control-Allow-Origin', ...); });

// ルートハンドラー
app.get('/api/v1/auth/authorize', (req, res) => {
  // ❌ res.header('Access-Control-Allow-Origin', ...); // 削除
  res.json({ ... });
});
```

### 方法2: 手動ヘッダー設定のみを使用

`cors`ミドルウェアを使用せず、手動でヘッダーを設定する場合：

```typescript
// ✅ 正しいコード
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

// ルートハンドラー（CORSヘッダーの設定を削除）
app.get('/api/v1/auth/authorize', (req, res) => {
  // ❌ res.header('Access-Control-Allow-Origin', ...); // 削除
  res.json({ ... });
});
```

### 方法3: 環境変数を使用した動的設定

本番環境と開発環境で異なるオリジンを許可する場合：

```typescript
// ✅ 正しいコード
import express from 'express';
import cors from 'cors';

const app = express();

// 許可されたオリジンのリスト
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // 開発環境
  'https://sys-a1int.work', // 本番環境
];

// corsミドルウェアで動的にオリジンを設定
app.use(cors({
  origin: (origin, callback) => {
    // OPTIONSリクエスト（originがundefined）の場合は許可
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// 手動でのCORSヘッダー設定を削除（すべて）
```

## 確認方法

### 1. 既存のLambda関数のコードを確認

既存のLambda関数（`a1kintai-APIHandler`）のコードで、以下を確認してください：

1. **`cors`ミドルウェアの使用箇所**
   ```typescript
   // 検索: import cors from 'cors';
   // 検索: app.use(cors(...));
   ```

2. **手動でのCORSヘッダー設定**
   ```typescript
   // 検索: res.header('Access-Control-Allow-Origin'
   // 検索: res.setHeader('Access-Control-Allow-Origin'
   // 検索: Access-Control-Allow-Origin
   ```

3. **ミドルウェアでのCORSヘッダー設定**
   ```typescript
   // 検索: app.use((req, res, next) => {
   // 検索: Access-Control-Allow
   ```

### 2. 重複箇所を特定

以下のパターンで重複している可能性があります：

- `cors`ミドルウェア + 手動ヘッダー設定
- 複数のミドルウェアで同じヘッダーを設定
- ミドルウェア + 各ルートハンドラーで設定

### 3. 修正後の動作確認

修正後、以下を確認してください：

1. **ブラウザの開発者ツール**でNetworkタブを確認
   - `Access-Control-Allow-Origin`が1つだけ含まれていることを確認
   - 値が`http://localhost:5173`であることを確認

2. **CloudWatch Logs**でレスポンスを確認
   - レスポンスヘッダーが正しく設定されていることを確認

## 修正手順（別のリポジトリで実行）

1. **既存のLambda関数のコードを確認**
   - CORSヘッダーを設定している箇所をすべて特定

2. **重複しているCORSヘッダー設定を削除**
   - `cors`ミドルウェアのみを使用するか、手動ヘッダー設定のみを使用
   - 両方を併用しない

3. **修正後のコードをデプロイ**
   - Lambda関数を再デプロイ
   - API Gatewayの統合を確認（変更不要の場合はスキップ）

4. **動作確認**
   - ブラウザでAPIリクエストを送信
   - CORSエラーが解消されていることを確認

## よくある問題と解決方法

### 問題1: corsミドルウェアと手動ヘッダー設定の併用

**問題**: `cors`ミドルウェアと手動でのヘッダー設定を併用している

**解決方法**: どちらか一方のみを使用する

### 問題2: 複数のミドルウェアで同じヘッダーを設定

**問題**: 複数のミドルウェアで同じCORSヘッダーを設定している

**解決方法**: 1つのミドルウェアでのみCORSヘッダーを設定する

### 問題3: OPTIONSリクエストの処理

**問題**: OPTIONSリクエスト（CORS preflight）を手動で処理している

**解決方法**: `cors`ミドルウェアを使用する場合、OPTIONSリクエストは自動処理されるため、手動処理は不要

## 参考リンク

- [Express CORS ミドルウェア](https://expressjs.com/en/resources/middleware/cors.html)
- [serverless-express](https://github.com/vendia/serverless-express)

## 修正後の期待結果

修正後、ブラウザの開発者ツールで以下のように表示されるはずです：

```
Access-Control-Allow-Origin: http://localhost:5173  (1つだけ)
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS  (1つだけ)
Access-Control-Allow-Headers: Content-Type,Authorization,...  (1つだけ)
Access-Control-Allow-Credentials: true  (1つだけ)
```

CORSエラーは解消され、APIリクエストが正常に動作するはずです。

## 関連ドキュメント

- [CORS修正まとめ](./CORS_FIX_SUMMARY.md) - 簡易版まとめドキュメント

