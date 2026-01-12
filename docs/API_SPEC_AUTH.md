# 認証認可API IF仕様書

## 概要

Cognitoでの認証後、従業員情報を取得してロール（管理者/従業員）を判定するAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/auth`

**認証**: Cognito User Poolのアクセストークンが必要です。

---

## 1. 認可情報取得

### エンドポイント

```
GET /auth/authorize
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### リクエスト例

```bash
GET /auth/authorize
Authorization: Bearer {access_token}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "employeeId": "1",
    "firstName": "山田",
    "lastName": "太郎",
    "email": "yamada@example.com",
    "role": "admin",
    "isActive": true,
    "joinDate": "2024-01-01",
    "leaveDate": null
  }
}
```

#### レスポンスボディのスキーマ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |
| firstName | string | はい | 苗字（姓） |
| lastName | string | はい | 名前（名） |
| email | string | はい | メールアドレス |
| role | string | はい | ロール（`'admin'`または`'employee'`）← この値をX-User-Roleヘッダーに使用 |
| isActive | boolean | はい | 在籍中かどうか |
| joinDate | string | はい | 入社日（YYYY-MM-DD形式） |
| leaveDate | string \| null | はい | 退職日（YYYY-MM-DD形式、nullの場合は在籍中） |

**注意事項**:
- `firstName`（苗字/姓）と`lastName`（名前/名）は別々のフィールドで返却されます
- フロントエンド側で表示する際は、日本語の慣習に従って「姓 名」の順序で結合してください（例: `${firstName} ${lastName}` → "山田 太郎"）

### エラーレスポンス

#### 401 Unauthorized

認証トークンが無効な場合

```json
{
  "error": "Unauthorized",
  "message": "認証トークンが無効です"
}
```

#### 403 Forbidden

在籍していない従業員の場合（入社日 > 現在日 または 退職日 <= 現在日）

```json
{
  "error": "Forbidden",
  "message": "在籍していない従業員はログインできません",
  "details": {
    "email": "yamada@example.com",
    "joinDate": "2025-04-01",
    "leaveDate": null,
    "reason": "入社日が未来の日付です"
  }
}
```

#### 404 Not Found

従業員情報が見つからない場合（メールアドレスが従業員テーブルに存在しない）

```json
{
  "error": "NotFound",
  "message": "従業員情報が見つかりません",
  "details": {
    "email": "unknown@example.com"
  }
}
```

---

## 2. 認可情報更新（トークンリフレッシュ時）

### エンドポイント

```
POST /auth/refresh-authorization
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### リクエスト例

```bash
POST /auth/refresh-authorization
Authorization: Bearer {access_token}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "employeeId": "1",
    "firstName": "山田",
    "lastName": "太郎",
    "email": "yamada@example.com",
    "role": "admin",
    "isActive": true,
    "joinDate": "2024-01-01",
    "leaveDate": null
  }
}
```

レスポンス形式は認可情報取得と同じです。

### エラーレスポンス

認可情報取得と同じエラーレスポンスを返却します。

### 使用タイミング

このエンドポイントは、以下のタイミングで呼び出します：

1. **Amplify Hubの`tokenRefresh`イベント発火時**
   - Amplifyが自動的にトークンをリフレッシュした際に発火
   - このイベントを監視して、認可情報を更新

2. **APIリクエスト時の401エラー発生時（オプション）**
   - 他のAPIリクエストで401エラーが返ってきた場合
   - トークンが期限切れの可能性があるため、リフレッシュ後に再試行

**注意**: トークンリフレッシュはAmplifyが自動的に実行するため、手動でトークンをリフレッシュする必要はありません。このエンドポイントは、リフレッシュされたトークンを使用して認可情報を更新するために使用します。

---

## データモデル

### AuthorizationResponse

```typescript
interface AuthorizationResponse {
  employeeId: string;          // 従業員ID
  firstName: string;           // 苗字（姓）
  lastName: string;            // 名前（名）
  email: string;               // メールアドレス
  role: 'admin' | 'employee'; // ロール
  isActive: boolean;           // 在籍中かどうか
  joinDate: string;            // 入社日（YYYY-MM-DD）
  leaveDate: string | null;    // 退職日（YYYY-MM-DD、nullの場合は在籍中）
}
```

**注意事項**:
- `firstName`（苗字/姓）と`lastName`（名前/名）は別々のフィールドで返却されます
- フロントエンド側で表示する際は、日本語の慣習に従って「姓 名」の順序で結合してください（例: `${firstName} ${lastName}` → "山田 太郎"）

---

## 認可ロジック

### 在籍判定

以下の条件をすべて満たす場合、従業員は「在籍中」と判定されます：

1. **メールアドレスが従業員テーブルに存在する**
   - CognitoのIDトークンからメールアドレスを取得
   - 従業員テーブル（`employees`）でメールアドレスを検索

2. **入社日 <= 現在日**
   - `joinDate <= 現在日（YYYY-MM-DD）`

3. **退職日がnull または 退職日 > 現在日**
   - `leaveDate IS NULL OR leaveDate > 現在日（YYYY-MM-DD）`

### ロール判定

- **管理者**: `employees.isAdmin = true` の場合、`role = "admin"`
- **従業員**: `employees.isAdmin = false` の場合、`role = "employee"`

### 認可フロー

```
1. ユーザーがCognitoで認証（メール/パスワード or Google OAuth）
   ↓
2. CognitoからIDトークンを取得
   ↓
3. IDトークンからメールアドレスを抽出
   ↓
4. GET /auth/authorize を呼び出し（IDトークンをAuthorizationヘッダーに設定）
   ↓
5. API側で以下を実行：
   a. IDトークンを検証
   b. メールアドレスを取得
   c. 従業員テーブルでメールアドレスを検索
   d. 在籍判定（入社日 <= 現在日 < 退職日）
   e. ロール判定（isAdminフラグから）
   ↓
6. 認可情報をレスポンスとして返却
   ↓
7. フロントエンドで認可情報をローカルストレージに保存
   ↓
8. 以降のAPIリクエストでX-Requested-Byヘッダーに従業員名を設定
```

---

## Lambda関数実装時の注意事項

### 1. 認証トークンの検証

- Cognito User PoolのIDトークンを検証
- トークンの有効期限を確認
- トークンの署名を検証

### 2. メールアドレスの取得

IDトークンからメールアドレスを取得する方法：

```typescript
// JWTトークンをデコード
const decodedToken = jwt.decode(idToken);
const email = decodedToken.email || decodedToken['cognito:username'];
```

### 3. 在籍判定の実装

```sql
-- 在籍中の従業員を取得
SELECT * FROM employees
WHERE email = :email
  AND join_date <= CURRENT_DATE
  AND (leave_date IS NULL OR leave_date > CURRENT_DATE);
```

### 4. エラーハンドリング

- **401 Unauthorized**: トークンが無効または期限切れ
- **403 Forbidden**: 在籍していない従業員
- **404 Not Found**: 従業員情報が見つからない

### 5. セキュリティ考慮事項

- トークンの検証は必ずサーバー側で実施
- メールアドレスの検証（形式チェック）
- SQLインジェクション対策（パラメータ化クエリ）
- レート制限の実装（ブルートフォース攻撃対策）

### 6. パフォーマンス

- 従業員テーブルにメールアドレスでインデックスを作成
- 認可情報をキャッシュ（TTL: 1時間程度）
- トークンリフレッシュ時はキャッシュを無効化

---

## フロントエンド実装時の注意事項

### 1. 認可情報の保存

認可情報取得後、以下の情報をローカルストレージに保存：

```typescript
// 姓・名の順序で表示名を生成（firstName = 苗字/姓, lastName = 名前/名）
const displayName = `${response.firstName} ${response.lastName}`; // "山田 太郎"

const userInfo = {
  employeeId: response.employeeId,
  requestedBy: displayName, // X-Requested-Byヘッダー用（姓・名の順序）
  role: response.role,
  email: response.email
};
localStorage.setItem('userInfo', JSON.stringify(userInfo));
```

### 2. トークンリフレッシュ時の処理

Cognitoのトークンがリフレッシュされた場合、`POST /auth/refresh-authorization`を呼び出して認可情報を更新。

#### トークンリフレッシュの判断方法

AWS Amplifyでは、以下の方法でトークンリフレッシュを判断します：

1. **Amplify Hubイベントの監視（推奨）**
   - Amplify Hubの`auth`チャンネルで`tokenRefresh`イベントを監視
   - トークンが自動的にリフレッシュされた際にイベントが発火

2. **APIリクエスト時の401エラー**
   - APIリクエスト時に401 Unauthorizedエラーが返ってきた場合
   - トークンが期限切れの可能性があるため、リフレッシュを試行

3. **トークンの有効期限チェック（オプション）**
   - IDトークンの有効期限をチェック
   - 期限切れ前にリフレッシュを実行

#### 実装例

```typescript
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { apiRequest } from '../config/apiConfig';

// 認可情報を更新する関数
const refreshAuthorization = async () => {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    
    if (!idToken) {
      throw new Error('認証トークンが取得できませんでした');
    }

    const response = await apiRequest('/api/v1/auth/refresh-authorization', {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '認可情報の更新に失敗しました');
    }

    const data = await response.json();
    
    // 姓・名の順序で表示名を生成（firstName = 苗字/姓, lastName = 名前/名）
    const displayName = `${data.data.firstName} ${data.data.lastName}`; // "山田 太郎"
    
    // ローカルストレージを更新
    const userInfo = {
      employeeId: data.data.employeeId,
      requestedBy: displayName, // X-Requested-Byヘッダー用（姓・名の順序）
      role: data.data.role,
      email: data.data.email
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    return data.data;
  } catch (error) {
    console.error('Failed to refresh authorization:', error);
    throw error;
  }
};

// Amplify Hubでトークンリフレッシュイベントを監視
useEffect(() => {
  const hubListenerCancelToken = Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'tokenRefresh') {
      console.log('🔄 Token refreshed');
      // 認可情報を更新
      refreshAuthorization().catch(error => {
        console.error('Failed to refresh authorization after token refresh:', error);
      });
    }
  });

  return () => {
    hubListenerCancelToken();
  };
}, []);
```

#### 注意事項

- トークンリフレッシュはAmplifyが自動的に実行するため、手動でリフレッシュする必要はありません
- `tokenRefresh`イベントは、トークンが正常にリフレッシュされた場合にのみ発火します
- `tokenRefresh_failure`イベントが発火した場合は、ログイン画面にリダイレクトすることを推奨します

### 3. ログアウト時の処理

ログアウト時は、ローカルストレージから認可情報を削除：

```typescript
localStorage.removeItem('userInfo');
```

### 4. エラーハンドリング

- **403 Forbidden**: 在籍していない従業員の場合、ログイン画面にリダイレクト
- **404 Not Found**: 従業員情報が見つからない場合、エラーメッセージを表示

---

## 使用例

### フロントエンドでの実装例

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';
import { apiRequest } from '../config/apiConfig';

// 認可情報を取得
const getAuthorization = async () => {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    
    if (!idToken) {
      throw new Error('認証トークンが取得できませんでした');
    }

    const response = await apiRequest('/api/v1/auth/authorize', {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '認可情報の取得に失敗しました');
    }

    const data = await response.json();
    
    // 姓・名の順序で表示名を生成（firstName = 苗字/姓, lastName = 名前/名）
    const displayName = `${data.data.firstName} ${data.data.lastName}`; // "山田 太郎"
    
    // ローカルストレージに保存
    const userInfo = {
      employeeId: data.data.employeeId,
      requestedBy: displayName, // X-Requested-Byヘッダー用（姓・名の順序）
      role: data.data.role,
      email: data.data.email
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    return data.data;
  } catch (error) {
    console.error('Failed to get authorization:', error);
    throw error;
  }
};
```

---

## 関連ドキュメント

- [従業員API IF仕様書](./API_SPEC_EMPLOYEES.md)
- [API仕様書一覧](./API_SPEC_INDEX.md)

