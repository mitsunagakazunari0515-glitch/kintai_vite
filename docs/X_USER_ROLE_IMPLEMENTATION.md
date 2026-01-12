# X-User-Role ヘッダー実装ガイド

## 概要

このドキュメントは、添付資料「FE_AUTHORIZATION_GUIDE.md」に基づいて、フロントエンド側で`X-User-Role`ヘッダーを実装した内容を説明します。

## 実装内容

### 1. `getUserInfo`関数の拡張

`src/config/apiConfig.ts`の`getUserInfo`関数を拡張し、`role`も返すようにしました。

```typescript
// 修正前
export const getUserInfo = (): { requestedBy: string | null; employeeId: string | null } => {
  // ...
};

// 修正後
export const getUserInfo = (): { requestedBy: string | null; employeeId: string | null; role: string | null } => {
  // ...
  return {
    requestedBy: userInfo.requestedBy || null,
    employeeId: userInfo.employeeId || null,
    role: userInfo.role || null  // 追加
  };
};
```

### 2. `X-User-Role`ヘッダーの自動追加

`apiRequest`関数内で、認可API以外のすべてのAPIリクエストに`X-User-Role`ヘッダーを自動追加するように実装しました。

```typescript
// 認可APIエンドポイント判定
const authEndpoints = ['/api/v1/auth/authorize', '/api/v1/auth/refresh-authorization'];
const isAuthEndpoint = authEndpoints.some(endpoint => path.includes(endpoint));

// X-User-Roleを設定（認可API以外のすべてのAPIリクエストに必須）
if (!isAuthEndpoint && !requestHeaders['X-User-Role']) {
  const userInfo = getUserInfo();
  if (userInfo.role) {
    requestHeaders['X-User-Role'] = userInfo.role; // 'admin' または 'employee'
  } else {
    // roleが設定されていない場合の警告
    console.warn('⚠️ Warning: X-User-Role header is not set. Please call GET /api/v1/auth/authorize first to get your role.');
  }
}
```

### 3. 最適化

`getUserInfo`関数が複数回呼び出されていた問題を修正し、1回の呼び出しにまとめました。

```typescript
// ユーザー情報を一度だけ取得（複数のヘッダー設定で使用）
const userInfo = getUserInfo();

// X-Requested-By、X-Employee-Id、X-User-Roleの設定で同じuserInfoを使用
```

## 実装の流れ

### 1. ログイン時

```
1. ユーザーがログイン（Cognito認証）
   ↓
2. GET /api/v1/auth/authorize を呼び出し
   - Authorization: Bearer <idToken>
   - X-User-Role: 設定しない（認可APIのため）
   ↓
3. APIレスポンスから role を取得
   - { role: 'admin' | 'employee', ... }
   ↓
4. localStorage に userInfo を保存
   - { employeeId, requestedBy, role, email }
   ↓
5. AuthContext で userRole を設定
```

### 2. 以降のAPIリクエスト時

```
1. APIリクエスト（例: GET /api/v1/employees）
   ↓
2. apiRequest 関数が呼び出される
   ↓
3. 認可APIエンドポイント判定
   - /api/v1/auth/authorize → 認可API
   - /api/v1/auth/refresh-authorization → 認可API
   - その他 → 通常のAPI
   ↓
4. 認可API以外の場合、X-User-Role ヘッダーを設定
   - localStorage から userInfo を取得
   - userInfo.role を X-User-Role ヘッダーに設定
   ↓
5. APIリクエストを実行
   - Authorization: Bearer <idToken>
   - X-User-Role: 'admin' または 'employee'
   - X-Requested-By: <encoded employeeName>
   - X-Employee-Id: <employeeId>
   - X-Request-Id: <uuid>
   - X-Device-Info: <deviceInfo>
```

## エラーハンドリング

### 1. `X-User-Role`ヘッダーが設定されていない場合

**警告**: `⚠️ Warning: X-User-Role header is not set. Please call GET /api/v1/auth/authorize first to get your role.`

**原因**:
- 認可API（`GET /api/v1/auth/authorize`）を呼び出していない
- `localStorage`に`userInfo`が保存されていない
- `userInfo.role`が設定されていない

**対処方法**:
- 認可APIを呼び出して`role`を取得
- `localStorage`に`userInfo`を保存

### 2. API側で400エラーが返される場合

**エラーレスポンス例**:
```json
{
  "statusCode": 400,
  "message": "X-User-Role header is required. Please call GET /api/v1/auth/authorize first to get your role.",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "X-User-Role header is required. Please call GET /api/v1/auth/authorize first to get your role."
  }
}
```

**対処方法**:
- 認可APIを呼び出して`role`を取得
- `localStorage`に`userInfo`を保存
- 再度APIリクエストを実行

## 実装ファイル

### 修正したファイル

1. **`src/config/apiConfig.ts`**
   - `getUserInfo`関数を拡張（`role`を返すように）
   - `apiRequest`関数で`X-User-Role`ヘッダーを自動追加
   - 認可APIエンドポイント判定ロジックを実装
   - `getUserInfo`の呼び出しを1回にまとめて最適化

### 確認が必要なファイル

1. **`src/contexts/AuthContext.tsx`**
   - 認可APIから取得した`role`を`localStorage`の`userInfo`に保存していることを確認
   - ✅ 実装済み（`localStorage.setItem('userInfo', JSON.stringify({ employeeId, requestedBy, role, email }))`）

2. **`src/utils/authApi.ts`**
   - 認可APIの呼び出しで`X-User-Role`ヘッダーを設定しないことを確認
   - ✅ 実装済み（`apiRequest`関数内で認可APIエンドポイント判定により、自動的にスキップされる）

## テスト方法

### 1. 認可APIの呼び出し

```typescript
// GET /api/v1/auth/authorize を呼び出し
// → X-User-Role ヘッダーは設定されない（認可APIのため）
const authInfo = await getAuthorization();
console.log(authInfo.role); // 'admin' または 'employee'
```

### 2. 通常のAPIリクエスト

```typescript
// GET /api/v1/employees を呼び出し
// → X-User-Role ヘッダーが自動的に設定される
const employees = await getEmployees();
// リクエストヘッダー:
// - Authorization: Bearer <idToken>
// - X-User-Role: 'admin' または 'employee'
// - X-Requested-By: <encoded employeeName>
// - X-Employee-Id: <employeeId>
```

### 3. エラーハンドリング

```typescript
// roleが設定されていない場合
// → 警告が表示されるが、リクエストは続行される
// → API側で400エラーが返される可能性がある

// 403エラーの場合
// → スナックバーでエラーメッセージを表示
// → リダイレクトしない（roleがadminの場合、権限エラーではないため）
```

## 注意事項

### 1. 認可APIエンドポイント

以下のエンドポイントは認可APIとして扱われ、`X-User-Role`ヘッダーは設定されません：

- `/api/v1/auth/authorize` (GET)
- `/api/v1/auth/refresh-authorization` (POST)

### 2. その他のAPIリクエスト

認可API以外のすべてのAPIリクエストに`X-User-Role`ヘッダーが自動的に設定されます：

- `/api/v1/employees` (GET, POST, PUT, DELETE)
- `/api/v1/attendance` (GET, POST, PUT)
- `/api/v1/payroll` (GET, POST, PUT, DELETE)
- その他すべてのAPIエンドポイント

### 3. `role`の取得タイミング

`role`は以下のタイミングで取得されます：

1. **初回ログイン時**: `GET /api/v1/auth/authorize`を呼び出して取得
2. **トークンリフレッシュ時**: `POST /api/v1/auth/refresh-authorization`を呼び出して更新
3. **401エラー発生時**: トークンリフレッシュ後に認可APIを再呼び出し

### 4. `localStorage`の管理

`userInfo`は`localStorage`に以下の形式で保存されます：

```json
{
  "employeeId": "1",
  "requestedBy": "山田太郎",
  "role": "admin",
  "email": "yamada@example.com"
}
```

## トラブルシューティング

### 問題: `X-User-Role`ヘッダーが設定されていない

**原因**:
- 認可APIを呼び出していない
- `localStorage`に`userInfo`が保存されていない
- `userInfo.role`が設定されていない

**対処方法**:
1. 認可API（`GET /api/v1/auth/authorize`）を呼び出して`role`を取得
2. `localStorage`に`userInfo`を保存（`AuthContext`で自動的に実行される）
3. 再度APIリクエストを実行

### 問題: API側で400エラーが返される

**原因**:
- `X-User-Role`ヘッダーが設定されていない

**対処方法**:
- 認可APIを呼び出して`role`を取得
- ブラウザのコンソールで警告メッセージを確認
- ネットワークタブでリクエストヘッダーを確認

### 問題: 403エラーが返される

**原因**:
- API側の権限チェックロジックに問題がある可能性
- データベースの`isAdmin`フラグが正しく設定されていない可能性

**対処方法**:
- フロントエンドでは、スナックバーでエラーメッセージを表示
- 既存のLambda関数（別リポジトリ）での権限チェックロジックを確認
- データベースの`isAdmin`フラグや`employeeId`が正しく設定されているか確認

## 関連ドキュメント

- [FE_AUTHORIZATION_GUIDE.md](../kintai_node/docs/FE_AUTHORIZATION_GUIDE.md): 添付資料（権限チェックの実装ガイド）
- [API_SPEC_AUTH.md](./API_SPEC_AUTH.md): 認証認可APIの仕様
- [PERMISSION_CHECK_FLOW.md](./PERMISSION_CHECK_FLOW.md): 権限チェックの実装とフロー

