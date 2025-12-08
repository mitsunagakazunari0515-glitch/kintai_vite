# API Gateway + Lambda + RDS セットアップガイド

このプロジェクトは、AppSync + DynamoDBの代わりに**API Gateway + Lambda + RDS**を使用するように設定されています。

## アーキテクチャ

```
フロントエンド (React)
    ↓
API Gateway (REST API)
    ↓
Lambda関数
    ↓
RDS (PostgreSQL/MySQL)
```

## 構成ファイル

### 1. API定義 (`amplify/api/resource.ts`)
- API Gatewayのエンドポイント定義
- CORS設定
- 認証方式の設定

### 2. Lambda関数 (`amplify/functions/api/`)
- `handler.ts`: Amplify Gen 2の関数定義
- `index.ts`: 実際のLambda関数コード
- `package.json`: Lambda関数の依存関係

### 3. バックエンド定義 (`amplify/backend.ts`)
- `auth`: Cognito認証
- `api`: API Gateway + Lambda
- `data`: AppSync + DynamoDB（無効化）

## セットアップ手順

### 1. RDSデータベースの準備

#### 既存のRDSを使用する場合（推奨）

既存のRDSインスタンスの接続情報を確認：
- エンドポイント（ホスト名）
- ポート
- データベース名
- ユーザー名
- パスワード

#### 新規にRDSを作成する場合

AWS RDSコンソールでPostgreSQLまたはMySQLインスタンスを作成してください。

### 2. シークレットの設定

RDS接続情報をAmplifyシークレットとして設定：

```bash
# RDS接続情報をシークレットとして設定
npx ampx sandbox secret set DB_HOST
npx ampx sandbox secret set DB_PORT
npx ampx sandbox secret set DB_NAME
npx ampx sandbox secret set DB_USER
npx ampx sandbox secret set DB_PASSWORD
```

### 3. Lambda関数の環境変数設定

`amplify/functions/api/handler.ts`を更新して、シークレットから接続情報を取得：

```typescript
environment: {
  DB_HOST: secret('DB_HOST'),
  DB_PORT: secret('DB_PORT'),
  DB_NAME: secret('DB_NAME'),
  DB_USER: secret('DB_USER'),
  DB_PASSWORD: secret('DB_PASSWORD'),
}
```

### 4. Lambda関数の実装

`amplify/functions/api/index.ts`にRDS接続とCRUD操作を実装してください。

#### PostgreSQLの例

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// 使用例
const result = await pool.query('SELECT * FROM employees');
```

### 5. RDSのVPC設定

Lambda関数がRDSにアクセスできるように：
- Lambda関数をRDSと同じVPCに配置
- セキュリティグループでRDSへのアクセスを許可

### 6. サンドボックスの起動

```bash
npx ampx sandbox
```

これにより、API GatewayとLambda関数が作成されます。

## エンドポイント

作成されるAPIエンドポイント：

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

## フロントエンドからの使用

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

// API Gatewayエンドポイントにリクエスト
const session = await fetchAuthSession();
const response = await fetch('https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/employees', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.tokens?.accessToken}`,
    'Content-Type': 'application/json',
  },
});

const employees = await response.json();
```

## 本番環境の設定

本番環境では、既存のAPI Gateway + Lambda + RDSを使用する場合：

1. `amplify_outputs.production.json`にAPI Gatewayエンドポイントを設定
2. Lambda関数を既存のRDSに接続するように設定
3. 環境変数で本番RDSの接続情報を設定

## 注意事項

- RDSへのアクセスには適切なVPCとセキュリティグループの設定が必要
- Lambda関数のタイムアウトはRDSクエリの実行時間を考慮して設定
- データベース接続プールを使用してパフォーマンスを最適化
- 本番環境では、RDS接続情報はシークレットマネージャーで管理

## トラブルシューティング

### Lambda関数がRDSに接続できない

1. VPC設定を確認
2. セキュリティグループでRDSへのアクセスを許可
3. Lambda関数の実行ロールにVPCアクセス権限があるか確認

### タイムアウトエラー

1. Lambda関数のタイムアウト設定を延長
2. RDSクエリの最適化
3. コネクションプールの設定を確認

