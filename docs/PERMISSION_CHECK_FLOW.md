# 権限チェックの実装とフロー

## 概要

このアプリケーションでは、**2層の権限チェック**が実装されています：

1. **フロントエンド側のロールチェック**（`ProtectedRoute`）
2. **API側の権限チェック**（既存のLambda関数）

## 1. フロントエンド側のロールチェック（ProtectedRoute）

### 実装場所
- `src/components/ProtectedRoute.tsx`

### チェック内容

```typescript
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  
  // 1. 認証状態のチェック
  if (isLoading) {
    return null; // 読み込み中
  }
  
  if (!isAuthenticated || !userRole) {
    return <Navigate to="/login" replace />; // 未認証の場合はログイン画面へ
  }
  
  // 2. ロールチェック
  if (requiredRole && userRole !== requiredRole) {
    // ロールが一致しない場合（例: requiredRole='admin' だが userRole='employee'）
    localStorage.setItem('permissionDenied', JSON.stringify({
      message: 'アクセス権限がありません。管理者権限が必要です。',
      attemptedPath: location.pathname
    }));
    return <Navigate to="/login" replace />; // ログイン画面へリダイレクト
  }
  
  // 3. roleがadminでrequiredRoleもadminの場合、permissionDeniedをクリア
  if (requiredRole && userRole === requiredRole && userRole === 'admin') {
    const permissionDenied = localStorage.getItem('permissionDenied');
    if (permissionDenied) {
      localStorage.removeItem('permissionDenied'); // 権限があるため削除
    }
  }
  
  return <>{children}</>; // 権限がある場合、子コンポーネントを表示
};
```

### チェックのタイミング
- **ルートアクセス時**: ユーザーが特定のルートにアクセスしようとした時点
- **例**: `/admin/employees`にアクセスする場合、`requiredRole='admin'`が必要

### 判定基準
- `userRole`（`'admin'` | `'employee'` | `null`）
- `requiredRole`（ルートごとに指定される必要なロール）

### ロールの取得方法

ロールは、`AuthContext`で`/api/v1/auth/authorize` APIを呼び出して取得されます：

```typescript
// src/contexts/AuthContext.tsx
const fetchUserRole = useCallback(async (): Promise<UserRole> => {
  const authInfo = await getAuthorization(); // GET /api/v1/auth/authorize
  
  // APIレスポンスからroleを取得
  // {
  //   employeeId: "2",
  //   employeeName: "光永一也",
  //   email: "...",
  //   role: "admin" | "employee",
  //   isActive: true,
  //   joinDate: "2024-01-01",
  //   leaveDate: null
  // }
  
  return authInfo.role as UserRole; // 'admin' または 'employee'
}, []);
```

## 2. API側の権限チェック（既存のLambda関数）

### 実装場所
- 既存のLambda関数（別リポジトリ: `a1kintai-APIHandler`）

### チェック内容
- 既存のLambda関数が、各APIエンドポイント（例: `GET /api/v1/employees`）で権限チェックを実施
- 具体的な実装は、既存のLambda関数（`a1kintai-APIHandler`）に依存

### チェックのタイミング
- **APIリクエスト時**: フロントエンドからAPIリクエストが送信された時点
- **例**: `GET /api/v1/employees`を呼び出す場合、既存のLambda関数が権限チェックを実施

### レスポンス
- **200 OK**: 権限がある場合
- **403 Forbidden**: 権限がない場合（`アクセス権限がありません。`）

### フロントエンドでの処理

APIが403を返した場合、フロントエンドでは以下のように処理します：

```typescript
// src/pages/admin/EmployeeList.tsx
try {
  const fetchedEmployees = await getEmployees(); // GET /api/v1/employees
  // 成功時の処理
} catch (error: any) {
  // すべてのエラー（403エラーを含む）をスナックバーで表示
  // 注意: roleがadminの場合でも、既存のLambda関数が403を返す可能性がある
  // これはAPI側の権限チェックロジックの問題の可能性があるため、エラーメッセージを表示して画面に留まる
  setSnackbar({ message: errorMessage, type: 'error' });
  // リダイレクトしない（roleがadminの場合、権限エラーではないため）
}
```

## 認証・認可のフロー

### 1. ログイン時

```
1. ユーザーがログイン
   ↓
2. Cognito認証（Amplify Auth）
   - メール/パスワード or Googleログイン
   ↓
3. 認証成功後、JWTトークンを取得
   ↓
4. GET /api/v1/auth/authorize を呼び出し
   - Authorization: Bearer <JWTトークン>
   ↓
5. APIレスポンスから role を取得
   - { role: 'admin' | 'employee', isActive: true, ... }
   ↓
6. AuthContext で userRole を設定
   ↓
7. localStorage に userInfo を保存
   - { employeeId, requestedBy, role, email }
```

### 2. ルートアクセス時

```
1. ユーザーが特定のルートにアクセス（例: /admin/employees）
   ↓
2. ProtectedRoute でチェック
   - isAuthenticated: true か？
   - userRole: 'admin' か？
   - requiredRole: 'admin' と一致するか？
   ↓
3. チェック通過 → 子コンポーネントを表示
   ↓
4. EmployeeList がマウントされ、API呼び出し
   - GET /api/v1/employees
   ↓
5. 既存のLambda関数で権限チェック
   ↓
6. 権限がある場合 → 200 OK + データ
   権限がない場合 → 403 Forbidden + エラーメッセージ
   ↓
7. フロントエンドでエラーハンドリング
   - 403エラー → スナックバーでエラーメッセージを表示
   - リダイレクトしない（roleがadminの場合、権限エラーではないため）
```

### 3. 権限エラー時の処理

#### フロントエンド側のロールチェックで失敗した場合

```typescript
// ProtectedRoute.tsx
if (requiredRole && userRole !== requiredRole) {
  // 例: requiredRole='admin' だが userRole='employee'
  localStorage.setItem('permissionDenied', JSON.stringify({
    message: 'アクセス権限がありません。管理者権限が必要です。',
    attemptedPath: location.pathname
  }));
  return <Navigate to="/login" replace />; // ログイン画面へリダイレクト
}
```

#### API側の権限チェックで失敗した場合（403 Forbidden）

```typescript
// EmployeeList.tsx
catch (error: any) {
  // 403エラーを含むすべてのエラーをスナックバーで表示
  setSnackbar({ message: errorMessage, type: 'error' });
  // リダイレクトしない（roleがadminの場合、権限エラーではないため）
  // 既存のLambda関数での権限チェックロジックの問題の可能性があるため
}
```

## 権限チェックの違い

| チェック | 実装場所 | タイミング | 判定基準 | エラー時の動作 |
|---------|---------|----------|---------|--------------|
| フロントエンド側 | `ProtectedRoute.tsx` | ルートアクセス時 | `userRole` vs `requiredRole` | ログイン画面へリダイレクト |
| API側 | 既存のLambda関数 | APIリクエスト時 | 既存のLambda関数の実装に依存 | 403 Forbidden + エラーメッセージ |

## 注意事項

### 1. フロントエンド側のチェックは「UX向上のため」の補助的なもの

- フロントエンド側のロールチェックは、**ユーザー体験向上のため**の補助的なものです
- **セキュリティの最終的な保証は、API側の権限チェック**に依存します
- フロントエンド側のチェックをバイパスしても、API側で403が返されるため、実際のデータアクセスは防げます

### 2. API側の権限チェックに問題がある場合

- `role`が`admin`の場合でも、既存のLambda関数が403を返す可能性があります
- これは、**既存のLambda関数（別リポジトリ）での権限チェックロジックの問題**の可能性があります
- この場合、フロントエンドでは**スナックバーでエラーメッセージを表示し、画面に留まります**
- リダイレクトは行いません（`role`が`admin`の場合、権限エラーではないため）

### 3. `permissionDenied`の使用方法

- `permissionDenied`は、**フロントエンド側のロールチェックで失敗した場合のみ**設定されます
- APIが403を返した場合、`permissionDenied`は設定されません（API側の権限チェックロジックの問題の可能性があるため）
- `role`が`admin`で`requiredRole`も`admin`の場合、`permissionDenied`はクリアされます

## トラブルシューティング

### 問題: `role`が`admin`なのに、APIが403を返す

**原因**:
- 既存のLambda関数（別リポジトリ）での権限チェックロジックに問題がある可能性

**対処方法**:
1. 既存のLambda関数（`a1kintai-APIHandler`）での権限チェックロジックを確認
2. データベースの`isAdmin`フラグや`employeeId`が正しく設定されているか確認
3. JWTトークンの`email`とデータベースの`email`が一致しているか確認

### 問題: 無限レンダリングが発生する

**原因**:
- `permissionDenied`が`localStorage`に残っているため、`ProtectedRoute`でリダイレクトが発生し、コンポーネントが再マウントされている

**対処方法**:
- `role`が`admin`で`requiredRole`も`admin`の場合、`ProtectedRoute`で`permissionDenied`をクリア
- `EmployeeList`で`hasFetchedRef`を使用して、API呼び出しを1回のみ実行

## 参考資料

- [API_SPEC_AUTH.md](./API_SPEC_AUTH.md): 認証認可APIの仕様
- [PERMISSION_DENIED_LOGIC_EXPLANATION.md](./PERMISSION_DENIED_LOGIC_EXPLANATION.md): `permissionDenied`の判定ロジック説明
- [INFINITE_RENDERING_ANALYSIS.md](./INFINITE_RENDERING_ANALYSIS.md): 無限レンダリング問題の分析

