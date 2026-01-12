# 無限レンダリング問題の分析と解決方法

## 問題の症状

- コンソールに341件のエラーメッセージが表示される
- `Failed to fetch employees: Error: アクセス権限がありません。`が繰り返し発生
- `GET /api/v1/employees 403 (Forbidden)`が繰り返し発生

## 原因分析

### 1. React Strict Modeによる2回レンダリング

開発環境では、`React.StrictMode`により、コンポーネントが2回レンダリングされます。これは正常な動作ですが、`useEffect`が2回実行される可能性があります。

### 2. `useEffect`の依存配列が空でも、コンポーネントの再マウントが発生

- `ProtectedRoute`で`permissionDenied`をチェックしているため、リダイレクトが発生する可能性がある
- リダイレクトが発生すると、コンポーネントが再マウントされ、`useEffect`が再実行される
- これにより、無限ループが発生する可能性がある

### 3. `permissionDenied`の誤った使用

- `role`が`admin`の場合、`permissionDenied`を設定する必要はない
- しかし、APIが403を返す場合、`permissionDenied`を設定してリダイレクトするロジックが存在していた
- これにより、`ProtectedRoute`で`permissionDenied`をチェックしてリダイレクトし、コンポーネントが再マウントされ、再度403エラーが発生する無限ループが発生していた

### 4. `setSnackbar`による再レンダリング

- `setSnackbar`が呼ばれると、コンポーネントが再レンダリングされる
- しかし、`useEffect`の依存配列が空の場合、`useEffect`は再実行されないはず
- 問題は、`setSnackbar`による再レンダリングが、何らかの形で`useEffect`の再実行を引き起こしている可能性がある

## 解決方法

### 1. `permissionDenied`のチェックを削除

`role`が`admin`の場合、`permissionDenied`を設定する必要はないため、以下の修正を行いました：

- `ProtectedRoute`で`permissionDenied`のチェックを削除（`role`チェックのみ）
- `EmployeeList`で403エラーが発生した場合、`permissionDenied`を設定せず、スナックバーでエラーを表示

### 2. `hasFetchedRef`を使用して、API呼び出しを1回のみ実行

`useEffect`の依存配列が空の場合でも、コンポーネントが再マウントされると`useEffect`が再実行される可能性があるため、`hasFetchedRef`を使用して、API呼び出しを1回のみ実行するようにしました。

### 3. 403エラー時はリダイレクトせず、スナックバーでエラーを表示

`role`が`admin`の場合、APIが403を返すのは、既存のLambda関数（別リポジトリ）での権限チェックロジックの問題の可能性があるため、リダイレクトせず、エラーメッセージを表示して画面に留まるようにしました。

## 修正内容

### `EmployeeList.tsx`

```typescript
// 修正前
const hasPermissionErrorRef = useRef<boolean>(false); // 権限エラーが発生したかどうかのフラグ
const permissionDenied = localStorage.getItem('permissionDenied');
if (permissionDenied) {
  hasPermissionErrorRef.current = true;
  navigate('/login', { replace: true });
  return;
}

// 修正後
const hasFetchedRef = useRef<boolean>(false); // 既にAPI呼び出しを行ったかどうかのフラグ
if (hasFetchedRef.current) {
  return; // 既にAPI呼び出しを行った場合は、再実行しない
}
hasFetchedRef.current = true; // API呼び出しフラグを設定

// 403エラー時は、permissionDeniedを設定せず、スナックバーでエラーを表示
catch (error: any) {
  // すべてのエラー（403エラーを含む）をスナックバーで表示
  setSnackbar({ message: errorMessage, type: 'error' });
  // リダイレクトしない（roleがadminの場合、権限エラーではない）
}
```

### `ProtectedRoute.tsx`

```typescript
// 修正前
const permissionDenied = localStorage.getItem('permissionDenied');
if (permissionDenied && location.pathname !== '/login') {
  return <Navigate to="/login" replace />;
}

// 修正後
// permissionDeniedのチェックを削除（roleチェックのみ）
// roleがadminの場合、permissionDeniedを設定する必要はない
```

## 確認事項

### 1. React Strict Modeによる2回レンダリング

開発環境では、`React.StrictMode`により、コンポーネントが2回レンダリングされます。これは正常な動作ですが、`useEffect`が2回実行される可能性があります。

**確認方法**:
```typescript
useEffect(() => {
  console.log('useEffect executed'); // 開発環境では2回表示される可能性がある
}, []);
```

**対処方法**:
- `hasFetchedRef`を使用して、API呼び出しを1回のみ実行する
- または、本番環境では`React.StrictMode`を削除する

### 2. `permissionDenied`の設定タイミング

`permissionDenied`は、以下の場合に設定されます：

- `ProtectedRoute`で`userRole !== requiredRole`の場合（フロントエンドでのロールチェック）

**注意**: APIが403を返す場合、`permissionDenied`を設定する必要はありません。これは、既存のLambda関数（別リポジトリ）での権限チェックロジックの問題の可能性があるためです。

### 3. スナックバーの表示

403エラーが発生した場合、スナックバーでエラーメッセージを表示します。リダイレクトは行いません。

## 次のステップ

1. ✅ `permissionDenied`のチェックを削除（修正済み）
2. ✅ `hasFetchedRef`を使用して、API呼び出しを1回のみ実行（修正済み）
3. ✅ 403エラー時はリダイレクトせず、スナックバーでエラーを表示（修正済み）
4. ⚠️ 既存のLambda関数（別リポジトリ）での権限チェックロジックを確認する必要がある

## 参考

- [React Strict Mode](https://react.dev/reference/react/StrictMode)
- [useEffect dependency array](https://react.dev/reference/react/useEffect)
- [useRef to prevent infinite loops](https://react.dev/reference/react/useRef)

