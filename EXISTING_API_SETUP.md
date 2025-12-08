# 既存のAPI Gateway + Lambda + RDS セットアップガイド

このプロジェクトでは、既存のAPI Gateway + Lambda + RDSを使用します。

## 構成

```
フロントエンド (React)
    ↓
既存のAPI Gateway (REST API)
    ↓
既存のLambda関数
    ↓
既存のRDS (PostgreSQL/MySQL)
```

## セットアップ手順

### 1. 既存のAPI Gatewayエンドポイントを確認

既存のAPI GatewayのエンドポイントURLを確認してください：
- AWSコンソール → API Gateway → あなたのAPI → ステージ → インボークURL

例: `https://abcdefghij.execute-api.ap-northeast-1.amazonaws.com/prod`

### 2. 環境変数の設定

`.env`ファイルを作成して、API Gatewayエンドポイントを設定：

```bash
# .env ファイルを作成
cp .env.example .env
```

`.env`ファイルを編集：

```env
# 開発環境用のAPI Gatewayエンドポイント
VITE_API_ENDPOINT=https://your-dev-api-id.execute-api.ap-northeast-1.amazonaws.com/dev

# 本番環境用のAPI Gatewayエンドポイント（オプション）
VITE_API_ENDPOINT_PRODUCTION=https://your-prod-api-id.execute-api.ap-northeast-1.amazonaws.com/prod

# Amplify環境設定
VITE_AMPLIFY_ENV=development  # または production
```

### 3. フロントエンドから使用

`src/config/apiConfig.ts`のヘルパー関数を使用：

```typescript
import { apiRequest, authenticatedApiRequest } from '../config/apiConfig';
import { fetchAuthSession } from 'aws-amplify/auth';

// 認証なしのリクエスト
const response = await apiRequest('/employees', {
  method: 'GET',
});

// 認証付きのリクエスト
const session = await fetchAuthSession();
const token = session.tokens?.accessToken?.toString();

const authResponse = await authenticatedApiRequest('/employees', token, {
  method: 'GET',
});

const employees = await authResponse.json();
```

### 4. 既存のLambda関数の設定確認

既存のLambda関数が以下を満たしているか確認：

1. **CORS設定**: フロントエンドのオリジン（`http://localhost:5173`、`https://www.sys-a1int.work`）を許可
2. **認証**: Cognito User Poolからのトークンを受け入れる設定
3. **RDS接続**: RDSへの接続が正しく設定されている

### 5. APIエンドポイント一覧

既存のAPI Gatewayに以下のエンドポイントが定義されていることを確認：

- `GET /employees` - 全従業員を取得
- `POST /employees` - 新規従業員を作成
- `GET /employees/{id}` - 特定の従業員を取得
- `PUT /employees/{id}` - 従業員を更新
- `DELETE /employees/{id}` - 従業員を削除
- `GET /attendance` - 出勤記録を取得
- `POST /attendance` - 出勤記録を作成
- `GET /leave-requests` - 休暇申請を取得
- `POST /leave-requests` - 休暇申請を作成
- `GET /payroll` - 給与情報を取得
- `POST /payroll` - 給与情報を作成

### 6. 認証の設定

既存のAPI GatewayがCognito User Poolからのトークンを受け入れるように設定されていることを確認：

1. API Gateway → オーソライザー → Cognitoオーソライザーが設定されているか
2. 各リソース/メソッドでオーソライザーが適用されているか
3. リクエストヘッダーに`Authorization: Bearer <token>`を送信する必要があるか

## 環境ごとの設定

### 開発環境

```env
VITE_AMPLIFY_ENV=development
VITE_API_ENDPOINT=https://your-dev-api-id.execute-api.ap-northeast-1.amazonaws.com/dev
```

- Amplifyサンドボックスのユーザープールを使用
- 開発環境のAPI Gatewayエンドポイントを使用

### 本番環境

```env
VITE_AMPLIFY_ENV=production
VITE_API_ENDPOINT_PRODUCTION=https://your-prod-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
```

- 既存のユーザープール `a1kintai-webapp` を使用
- 本番環境のAPI Gatewayエンドポイントを使用

## トラブルシューティング

### CORSエラーが発生する

既存のAPI GatewayでCORS設定を確認：
- API Gateway → アクション → CORSを有効化
- Access-Control-Allow-Originヘッダーにフロントエンドのオリジンを含める

### 401 Unauthorizedエラー

1. Cognitoトークンが正しく送信されているか確認
2. API Gatewayのオーソライザー設定を確認
3. トークンの有効期限を確認

### 500 Internal Server Error

1. Lambda関数のログ（CloudWatch Logs）を確認
2. RDS接続情報が正しいか確認
3. Lambda関数のタイムアウト設定を確認

## 注意事項

- `.env`ファイルは`.gitignore`に含まれています（機密情報を含むため）
- 本番環境のAPIエンドポイントは環境変数または環境固有の設定ファイルで管理してください
- API Gatewayのレート制限やクォータを確認してください

