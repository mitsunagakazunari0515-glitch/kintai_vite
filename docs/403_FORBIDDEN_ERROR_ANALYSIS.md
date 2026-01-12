# 403 Forbidden エラー分析

## エラー内容

```
GET https://tv731cev0j.execute-api.ap-northeast-1.amazonaws.com/dev/api/v1/employees 403 (Forbidden)
Failed to fetch employees: Error: アクセス権限がありません。
```

## 原因分析

403 Forbiddenエラーは、認証は成功しているが、**権限が不足している**ことを示しています。

### 考えられる原因

1. **既存のLambda関数が管理者権限を要求している**
   - 既存のLambda関数（`a1kintai-APIHandler`）が、従業員一覧取得API（`GET /api/v1/employees`）に対して管理者権限を要求している可能性があります

2. **ユーザーのロールが正しく設定されていない**
   - フロントエンドの`userRole`が`'admin'`に設定されていない可能性があります

3. **既存のLambda関数がJWTトークンから直接ロール情報を取得している**
   - 既存のLambda関数が、`X-Employee-Id`ヘッダーではなく、JWTトークンのペイロードから直接ロール情報を取得している可能性があります

4. **既存のLambda関数が従業員テーブルの`isAdmin`フラグで権限チェックを行っている**
   - 既存のLambda関数が、データベースから取得した従業員情報の`isAdmin`フラグで権限チェックを行っている可能性があります

## 確認事項

### 1. フロントエンドでの確認

#### `userRole`が正しく設定されているか確認

```typescript
// src/contexts/AuthContext.tsx
// checkAuthStatus関数内で、userRoleが'admin'に設定されているか確認

console.log('User Role:', userRole); // コンソールで確認
```

#### `localStorage`に`userInfo`が正しく保存されているか確認

```javascript
// ブラウザの開発者ツールのコンソールで確認
console.log(JSON.parse(localStorage.getItem('userInfo')));
// 期待される結果:
// {
//   employeeId: "emp001",
//   requestedBy: "山田太郎",
//   role: "admin",  // ← これが'admin'である必要がある
//   email: "admin@example.com"
// }
```

#### 認可情報取得API（`/api/v1/auth/authorize`）のレスポンスを確認

```javascript
// ブラウザの開発者ツールのNetworkタブで確認
// GET /api/v1/auth/authorize のレスポンス:
{
  "data": {
    "employeeId": "emp001",
    "employeeName": "山田太郎",
    "email": "admin@example.com",
    "role": "admin",  // ← これが'admin'である必要がある
    "isActive": true,
    "joinDate": "2020-04-01",
    "leaveDate": null
  }
}
```

### 2. 既存のLambda関数（別リポジトリ）での確認

既存のLambda関数（`a1kintai-APIHandler`）のコードを確認し、以下の点を確認してください：

1. **権限チェックの実装**
   - 従業員一覧取得API（`GET /api/v1/employees`）でどのような権限チェックが行われているか
   - 管理者権限を要求しているか

2. **ロール情報の取得方法**
   - JWTトークンから直接ロール情報を取得しているか
   - データベースから従業員情報を取得して`isAdmin`フラグでチェックしているか
   - `X-Employee-Id`ヘッダーを使用しているか

3. **403エラーの返却条件**
   - どのような条件で403エラーを返しているか

## 解決方法

### 方法1: ユーザーが管理者権限を持っていることを確認

既存のLambda関数が管理者権限を要求している場合、**ログインしているユーザーが管理者権限を持っている必要があります**。

#### 確認手順

1. **認可情報取得API（`/api/v1/auth/authorize`）のレスポンスを確認**
   ```bash
   # ブラウザの開発者ツールのNetworkタブで確認
   GET /api/v1/auth/authorize
   ```

2. **レスポンスの`role`フィールドが`'admin'`であることを確認**
   ```json
   {
     "data": {
       "role": "admin"  // ← これが'admin'である必要がある
     }
   }
   ```

3. **データベースで従業員情報の`isAdmin`フラグを確認**
   - ログインしているユーザーのメールアドレスに対応する従業員レコードの`isAdmin`フラグが`true`であることを確認

### 方法2: 既存のLambda関数の権限チェックロジックを確認

既存のLambda関数（別リポジトリ）で、従業員一覧取得APIの権限チェックロジックを確認してください。

#### 確認すべきポイント

1. **管理者権限を要求しているか**
   ```typescript
   // 既存のLambda関数（別リポジトリ）での例
   if (path === '/api/v1/employees' && method === 'GET') {
     // 管理者権限をチェック
     if (userRole !== 'admin') {
       return errorResponse(403, 'FORBIDDEN', 'アクセス権限がありません', undefined, event);
     }
     // ...
   }
   ```

2. **ロール情報の取得方法**
   ```typescript
   // JWTトークンから取得
   const payload = await jwtVerifier.verify(token);
   const userRole = payload['custom:role'] || payload.role;

   // または、データベースから取得
   const employee = await prisma.employee.findUnique({
     where: { email: payload.email }
   });
   const userRole = employee.isAdmin ? 'admin' : 'employee';
   ```

### 方法3: API仕様書の確認

API仕様書（`docs/API_SPEC_EMPLOYEES.md`）には、従業員一覧取得APIの権限要件が明記されていません。

#### 確認すべきポイント

1. **既存のLambda関数の実装と仕様書の整合性**
   - 既存のLambda関数が管理者権限を要求している場合、API仕様書に明記する必要があります

2. **仕様書の更新**
   - 従業員一覧取得APIに管理者権限が必要な場合は、仕様書を更新してください

## デバッグ方法

### 1. ブラウザの開発者ツールで確認

1. **Networkタブ**
   - `GET /api/v1/employees`リクエストのリクエストヘッダーを確認
   - `Authorization`ヘッダーが正しく設定されているか
   - `X-Employee-Id`ヘッダーが正しく設定されているか

2. **Applicationタブ**
   - `localStorage`の`userInfo`を確認
   - `role`が`'admin'`であることを確認

3. **Consoleタブ**
   - `userRole`の値を確認
   - エラーメッセージを確認

### 2. CloudWatch Logsで確認

既存のLambda関数（`a1kintai-APIHandler`）のCloudWatch Logsで、以下の情報を確認してください：

1. **リクエスト情報**
   - リクエストヘッダー（特に`Authorization`、`X-Employee-Id`）
   - パスパラメータ、クエリパラメータ

2. **認証・認可情報**
   - JWTトークンの検証結果
   - ロール情報の取得結果
   - 権限チェックの結果

3. **エラーレスポンス**
   - 403エラーが返された理由
   - 権限チェックで失敗した箇所

## 次のステップ

1. ✅ **フロントエンドで`userRole`が`'admin'`に設定されているか確認**
2. ✅ **認可情報取得API（`/api/v1/auth/authorize`）のレスポンスを確認**
3. ✅ **データベースで従業員情報の`isAdmin`フラグを確認**
4. ⚠️ **既存のLambda関数（別リポジトリ）の権限チェックロジックを確認**
5. ⚠️ **既存のLambda関数のCloudWatch Logsを確認**

## 参考

- [従業員API仕様書](./API_SPEC_EMPLOYEES.md)
- [認証認可API仕様書](./API_SPEC_AUTH.md)
- [既存Lambda関数の修正方法](./FIX_CORS_DUPLICATE_IN_EXISTING_LAMBDA.md)

