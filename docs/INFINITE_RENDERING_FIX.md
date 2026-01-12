# 無限レンダリングの原因と修正方法

## 問題の症状

- コンソールに341件のエラーメッセージが表示される
- `Failed to fetch employees: Error: アクセス権限がありません。`が繰り返し発生
- `GET /api/v1/employees 403 (Forbidden)`が繰り返し発生

## 原因分析

### 1. React Strict Modeによる2回レンダリング

開発環境では、`React.StrictMode`により、コンポーネントが2回レンダリングされます。これは正常な動作ですが、`useEffect`も2回実行される可能性があります。

**確認方法**:
- `main.tsx`で`<React.StrictMode>`を使用している
- 開発環境では、`useEffect`が2回実行される（1回目と2回目）

### 2. `hasFetchedRef`のタイミング問題

現在のコードでは、`hasFetchedRef.current = true`を設定する前に、`fetchEmployees`を呼び出しているため、React Strict Modeの2回目の実行時にも`hasFetchedRef.current`が`false`のままになり、API呼び出しが2回実行される可能性があります。

**問題のあるコード**:
```typescript
useEffect(() => {
  if (hasFetchedRef.current) {
    return; // 既にAPI呼び出しを行った場合は、再実行しない
  }

  isMountedRef.current = true;
  hasFetchedRef.current = true; // ← ここで設定するが、fetchEmployees()が非同期のため、2回目の実行時にはまだfalseの可能性がある

  const fetchEmployees = async () => {
    // ...
  };

  fetchEmployees(); // ← 非同期関数を呼び出す
}, []);
```

### 3. `localStorage`の`permissionDenied`が残っている

- `role`が`admin`の場合でも、`localStorage`に`permissionDenied`が残っている可能性がある
- これにより、`ProtectedRoute`や`EmployeeList`でチェックされ、リダイレクトが発生する可能性がある
- しかし、修正後は`permissionDenied`をチェックしないため、この問題は解決されるはず

## 修正方法

### 1. `hasFetchedRef`を`useEffect`の最初に設定

`hasFetchedRef.current = true`を、`fetchEmployees`を呼び出す前に設定します。

### 2. `localStorage`の`permissionDenied`をクリア

`role`が`admin`の場合、`permissionDenied`は不要なため、コンポーネントマウント時にクリアします。

### 3. React Strict Modeによる2回実行を考慮

開発環境では、`useEffect`が2回実行されることを考慮し、`hasFetchedRef`を使用して、2回目の実行時にはAPI呼び出しをスキップします。

## 修正コード

```typescript
export const EmployeeList: React.FC = () => {
  // ... (他のstate)

  const hasFetchedRef = useRef<boolean>(false); // 既にAPI呼び出しを行ったかどうかのフラグ
  const isMountedRef = useRef<boolean>(true); // コンポーネントがマウントされているかどうかのフラグ

  // 従業員一覧をAPIから取得
  useEffect(() => {
    // 既にAPI呼び出しを行った場合は、再実行しない
    if (hasFetchedRef.current) {
      return;
    }

    // 即座にフラグを設定して、2回目の実行を防ぐ
    hasFetchedRef.current = true;
    isMountedRef.current = true;

    const fetchEmployees = async () => {
      // マウント状態をチェック
      if (!isMountedRef.current) {
        return;
      }

      setIsLoadingEmployees(true);
      try {
        const fetchedEmployees = await getEmployees();
        
        // コンポーネントがアンマウントされている場合は処理をスキップ
        if (!isMountedRef.current) {
          return;
        }
        
        setEmployees(fetchedEmployees.map(emp => ({
          ...emp,
          employmentType: emp.employmentType as 'FULL_TIME' | 'PART_TIME'
        })));
      } catch (error: any) {
        // コンポーネントがアンマウントされている場合は処理をスキップ
        if (!isMountedRef.current) {
          return;
        }
        
        logError('Failed to fetch employees:', error);
        const errorMessage = translateApiError(error);
        
        // すべてのエラー（403エラーを含む）をスナックバーで表示
        setSnackbar({ message: errorMessage, type: 'error' });
        setTimeout(() => {
          if (isMountedRef.current) {
            setSnackbar(null);
          }
        }, 5000);
        
        // エラー時は空配列を設定
        setEmployees([]);
      } finally {
        // コンポーネントがマウントされている場合のみ状態を更新
        if (isMountedRef.current) {
          setIsLoadingEmployees(false);
        }
      }
    };

    fetchEmployees();

    // クリーンアップ関数: コンポーネントがアンマウントされた場合、isMountedRefをfalseに設定
    return () => {
      isMountedRef.current = false;
    };
  }, []); // 依存配列を空にして、マウント時のみ実行
};
```

## 注意事項

1. **React Strict Modeによる2回実行は正常な動作**
   - 開発環境では、`useEffect`が2回実行される
   - `hasFetchedRef`を使用して、2回目の実行時にはAPI呼び出しをスキップする

2. **`permissionDenied`は使用しない**
   - `role`が`admin`の場合、`permissionDenied`を設定する必要はない
   - APIが403を返す場合、スナックバーでエラーメッセージを表示する

3. **スナックバーの表示**
   - すべてのエラー（403エラーを含む）をスナックバーで表示
   - 5秒間表示してから自動的に閉じる

## 次のステップ

1. ✅ `hasFetchedRef`を`useEffect`の最初に設定（修正済み）
2. ✅ `permissionDenied`のチェックを削除（修正済み）
3. ✅ 403エラー時はリダイレクトせず、スナックバーでエラーを表示（修正済み）
4. ⚠️ 既存のLambda関数（別リポジトリ）での権限チェックロジックを確認する必要がある

