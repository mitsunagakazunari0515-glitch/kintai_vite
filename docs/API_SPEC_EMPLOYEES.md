# 従業員API IF仕様書

## 概要

従業員情報の取得、作成、更新、削除を行うAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/employees`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 従業員一覧取得

### エンドポイント

```
GET /employees
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### クエリパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employmentType | string | いいえ | 雇用形態でフィルタ（`正社員` / `パート`） |
| activeOnly | boolean | いいえ | `true`の場合は在籍中の従業員のみ取得（デフォルト: `true`） |
| search | string | いいえ | 従業員名で部分一致検索 |

#### リクエスト例

```bash
GET /employees?employmentType=正社員&activeOnly=true&search=山田
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "employees": [
    {
      "id": "emp001",
      "name": "山田 太郎",
      "employmentType": "正社員",
      "email": "yamada@example.com",
      "joinDate": "2020-04-01",
      "leaveDate": null,
      "allowances": ["allowance001", "allowance002"],
      "isAdmin": false,
      "baseSalary": 300000,
      "paidLeaveDays": 20,
      "createdAt": "2020-03-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50
}
```

#### エラーレスポンス

**401 Unauthorized**

```json
{
  "error": "Unauthorized",
  "message": "認証トークンが無効です"
}
```

**500 Internal Server Error**

```json
{
  "error": "InternalServerError",
  "message": "サーバーエラーが発生しました"
}
```

---

## 2. 従業員詳細取得

### エンドポイント

```
GET /employees/{employeeId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |

#### リクエスト例

```bash
GET /employees/emp001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "emp001",
  "name": "山田 太郎",
  "employmentType": "正社員",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
  "baseSalary": 300000,
  "paidLeaveDays": 20,
  "createdAt": "2020-03-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された従業員が見つかりません"
}
```

---

## 3. 従業員作成

### エンドポイント

```
POST /employees
```

### リクエスト

#### リクエストボディ

```json
{
  "name": "山田 太郎",
  "employmentType": "正社員",
  "email": "yamada@example.com",
  "joinDate": "2024-04-01",
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
  "baseSalary": 300000,
  "paidLeaveDays": 20
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | はい | 従業員名（最大100文字） |
| employmentType | string | はい | 雇用形態（`正社員` / `パート`） |
| email | string | はい | メールアドレス（形式チェック） |
| joinDate | string | はい | 入社日（YYYY-MM-DD形式） |
| leaveDate | string \| null | いいえ | 退社日（YYYY-MM-DD形式） |
| allowances | string[] | いいえ | 手当IDの配列 |
| isAdmin | boolean | いいえ | 管理者フラグ（デフォルト: `false`） |
| baseSalary | number | はい | 基本給（時給の場合も月給換算） |
| paidLeaveDays | number | いいえ | 有給日数（デフォルト: 0） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "emp001",
  "name": "山田 太郎",
  "employmentType": "正社員",
  "email": "yamada@example.com",
  "joinDate": "2024-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
  "baseSalary": 300000,
  "paidLeaveDays": 20,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "必須項目が不足しています",
  "details": [
    {
      "field": "email",
      "message": "メールアドレスの形式が正しくありません"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "このメールアドレスは既に登録されています"
}
```

---

## 4. 従業員更新

### エンドポイント

```
PUT /employees/{employeeId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |

#### リクエストボディ

```json
{
  "name": "山田 花子",
  "employmentType": "正社員",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance003"],
  "isAdmin": false,
  "baseSalary": 320000,
  "paidLeaveDays": 18
}
```

#### リクエストボディのスキーマ

（従業員作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "emp001",
  "name": "山田 花子",
  "employmentType": "正社員",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance003"],
  "isAdmin": false,
  "baseSalary": 320000,
  "paidLeaveDays": 18,
  "createdAt": "2020-03-15T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された従業員が見つかりません"
}
```

---

## 5. 従業員削除

### エンドポイント

```
DELETE /employees/{employeeId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |

#### リクエスト例

```bash
DELETE /employees/emp001
```

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された従業員が見つかりません"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "給与明細が登録されているため削除できません"
}
```

---

## データモデル

### Employee

```typescript
interface Employee {
  id: string;                    // 従業員ID（UUID形式推奨）
  name: string;                  // 従業員名
  employmentType: '正社員' | 'パート';  // 雇用形態
  email: string;                 // メールアドレス
  joinDate: string;              // 入社日（YYYY-MM-DD）
  leaveDate: string | null;      // 退社日（YYYY-MM-DD、nullの場合は在籍中）
  allowances: string[];          // 手当IDの配列
  isAdmin: boolean;              // 管理者フラグ
  baseSalary: number;            // 基本給
  paidLeaveDays: number;         // 有給日数
  createdAt: string;             // 作成日時（ISO 8601）
  updatedAt: string;             // 更新日時（ISO 8601）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 管理者のみが従業員の作成・更新・削除を実行可能
3. **バリデーション**: メールアドレスの重複チェック、日付形式の検証
4. **トランザクション**: RDSでの更新処理は適切にトランザクション管理
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却

