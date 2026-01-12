# permissionDeniedの判定ロジック説明

## permissionDeniedの使用箇所

### 1. `ProtectedRoute.tsx`

`ProtectedRoute`コンポーネントで、フロントエンドでのロールチェックを行っています：

```typescript
// ロールチェック
if (requiredRole && userRole !== requiredRole) {
  // ロールが一致しない場合はログインページにリダイレクト
  // 例: requiredRole='admin' だが userRole='employee' の場合
  localStorage.setItem('permissionDenied', JSON.stringify({
    message: 'アクセス権限がありません。管理者権限が必要です。',
    attemptedPath: location.pathname
  }));
  return <Navigate to="/login" replace />;
}
```

**判定方法**: 
- `requiredRole`（例: `'admin'`）と`userRole`（例: `'employee'`）が一致しない場合
- これは**フロントエンドでのロールチェック**のみ

### 2. `Login.tsx`

`Login`コンポーネントで、`permissionDenied`が設定されている場合、スナックバーでメッセージを表示します：

```typescript
useEffect(() => {
  const permissionDeniedStr = localStorage.getItem('permissionDenied');
  if (permissionDeniedStr) {
    try {
      const permissionDenied = JSON.parse(permissionDeniedStr);
      setSnackbar({ message: permissionDenied.message || 'アクセス権限がありません。管理者権限が必要です。', type: 'error' });
      setTimeout(() => setSnackbar(null), 5000);
      // 表示後は削除
      localStorage.removeItem('permissionDenied');
    } catch (e) {
      localStorage.removeItem('permissionDenied');
    }
  }
}, []);
```

**判定方法**:
- `localStorage`から`permissionDenied`を取得
- 存在する場合、スナックバーでメッセージを表示
- 表示後は削除

## 問題点

### 1. `role`が`admin`の場合でも、APIが403を返す可能性がある

- フロントエンドでは`userRole='admin'`が設定されている
- しかし、既存のLambda関数（別リポジトリ）が403を返す可能性がある
- これは、**API側の権限チェックロジックの問題**の可能性がある

### 2. `EmployeeList`で403エラーが発生した場合の処理

**修正前**:
- 403エラーが発生すると、`permissionDenied`を設定してリダイレクト
- しかし、`role`が`admin`の場合、これは権限エラーではない
- これにより、`ProtectedRoute`で`permissionDenied`をチェックしてリダイレクトし、コンポーネントが再マウントされ、再度403エラーが発生する無限ループが発生していた

**修正後**:
- 403エラーが発生しても、`permissionDenied`を設定しない
- スナックバーでエラーメッセージを表示
- リダイレクトしない（`role`が`admin`の場合、権限エラーではないため）

## 修正内容

### `EmployeeList.tsx`

```typescript
// 修正前
if (error?.status === 403 || error?.apiError?.statusCode === 403 || errorMessage.includes('アクセス権限')) {
  hasPermissionErrorRef.current = true;
  localStorage.setItem('permissionDenied', JSON.stringify({...}));
  navigate('/login', { replace: true });
  return;
}

// 修正後
// すべてのエラー（403エラーを含む）をスナックバーで表示
// 注意: roleがadminの場合でも、APIが403を返す可能性があるため、エラーメッセージを表示する
setSnackbar({ message: errorMessage, type: 'error' });
// リダイレクトしない（roleがadminの場合、権限エラーではない）
```

## 現在の動作

### 1. フロントエンドでのロールチェック（`ProtectedRoute`）

- `requiredRole='admin'`かつ`userRole='employee'`の場合: `permissionDenied`を設定してログイン画面にリダイレクト
- `requiredRole='admin'`かつ`userRole='admin'`の場合: 正常にアクセス可能（`permissionDenied`は設定しない）

### 2. APIでの権限チェック（既存のLambda関数）

- 既存のLambda関数（別リポジトリ）が403を返す場合: スナックバーでエラーメッセージを表示
- リダイレクトしない（`role`が`admin`の場合、権限エラーではないため）

## 注意事項

1. **`permissionDenied`は、フロントエンドでのロールチェックのみで使用**
   - `ProtectedRoute`で`userRole !== requiredRole`の場合のみ設定
   - APIが403を返す場合、設定しない（API側の権限チェックロジックの問題の可能性があるため）

2. **APIが403を返す場合の対応**
   - `role`が`admin`の場合: スナックバーでエラーメッセージを表示し、画面に留まる
   - 既存のLambda関数（別リポジトリ）での権限チェックロジックを確認する必要がある

3. **無限レンダリングの防止**
   - `hasFetchedRef`を使用して、API呼び出しを1回のみ実行
   - `permissionDenied`を設定しない（403エラーが発生した場合）

## 次のステップ

1. ✅ `permissionDenied`のチェックを削除（403エラー時）（修正済み）
2. ✅ `hasFetchedRef`を使用して、API呼び出しを1回のみ実行（修正済み）
3. ✅ 403エラー時はリダイレクトせず、スナックバーでエラーを表示（修正済み）
4. ⚠️ 既存のLambda関数（別リポジトリ）での権限チェックロジックを確認する必要がある

