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
| employmentType | string | いいえ | 雇用形態コードでフィルタ（`FULL_TIME` / `PART_TIME`）<br>※雇用形態コード一覧は[employment_types.json](./employment_types.json)を参照 |
| activeOnly | boolean | いいえ | `true`の場合は在籍中の従業員のみ取得（デフォルト: `true`） |
| search | string | いいえ | 従業員名で部分一致検索 |

#### リクエスト例

```bash
GET /employees?employmentType=FULL_TIME&activeOnly=true&search=山田
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "employees": [
    {
      "id": "emp001",
      "firstName": "山田",
      "lastName": "太郎",
      "employmentType": "FULL_TIME",
      "email": "yamada@example.com",
      "joinDate": "2020-04-01",
      "leaveDate": null,
      "allowances": ["allowance001", "allowance002"],
      "isAdmin": false,
      "baseSalary": 300000,
      "paidLeaves": [
        {
          "grantDate": "2020-04-01",
          "days": 20
        }
      ],
      "defaultBreakTime": 90,
      "prescribedWorkHours": null,
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
  "firstName": "山田",
  "lastName": "太郎",
  "employmentType": "FULL_TIME",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
      "baseSalary": 300000,
      "paidLeaves": [
        {
          "grantDate": "2020-04-01",
          "days": 20
        }
      ],
      "defaultBreakTime": 90,
      "prescribedWorkHours": null,
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
  "firstName": "山田",
  "lastName": "太郎",
  "employmentType": "FULL_TIME",
  "email": "yamada@example.com",
  "joinDate": "2024-04-01",
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
  "baseSalary": 300000,
  "paidLeaves": [
    {
      "grantDate": "2024-04-01",
      "days": 20
    }
  ],
  "defaultBreakTime": 90,
  "prescribedWorkHours": null
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| firstName | string | はい | 苗字（姓、最大50文字） |
| lastName | string | はい | 名前（名、最大50文字） |
| employmentType | string | はい | 雇用形態コード（`FULL_TIME` / `PART_TIME`）<br>※雇用形態コード一覧は[employment_types.json](./employment_types.json)を参照 |
| email | string | はい | メールアドレス（形式チェック） |
| joinDate | string | はい | 入社日（YYYY-MM-DD形式） |
| leaveDate | string \| null | いいえ | 退社日（YYYY-MM-DD形式） |
| allowances | string[] | いいえ | 手当IDの配列 |
| isAdmin | boolean | いいえ | 管理者フラグ（デフォルト: `false`） |
| baseSalary | number | はい | 基本給（正社員: 月給、パート: 時給） |
| paidLeaves | PaidLeave[] | いいえ | 有給情報の配列（空配列の場合は未設定） |
| defaultBreakTime | number | いいえ | 基本休憩時間（分単位、30/60/90、デフォルト: 60） |
| prescribedWorkHours | number | いいえ | 所定労働時間（時間単位、パートの場合のみ、1日あたり） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "emp001",
  "firstName": "山田",
  "lastName": "太郎",
  "employmentType": "FULL_TIME",
  "email": "yamada@example.com",
  "joinDate": "2024-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance002"],
  "isAdmin": false,
      "baseSalary": 300000,
      "paidLeaves": [
        {
          "grantDate": "2024-04-01",
          "days": 20
        }
      ],
      "defaultBreakTime": 90,
      "prescribedWorkHours": null,
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
  "firstName": "山田",
  "lastName": "花子",
  "employmentType": "FULL_TIME",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance003"],
  "isAdmin": false,
  "baseSalary": 320000,
      "paidLeaves": [
        {
          "grantDate": "2020-04-01",
          "days": 18
        }
      ],
      "defaultBreakTime": 90,
      "prescribedWorkHours": null
}
```

#### リクエストボディのスキーマ

（従業員作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "emp001",
  "firstName": "山田",
  "lastName": "花子",
  "employmentType": "FULL_TIME",
  "email": "yamada@example.com",
  "joinDate": "2020-04-01",
  "leaveDate": null,
  "allowances": ["allowance001", "allowance003"],
  "isAdmin": false,
  "baseSalary": 320000,
      "paidLeaves": [
        {
          "grantDate": "2020-04-01",
          "days": 18
        }
      ],
      "defaultBreakTime": 90,
      "prescribedWorkHours": null,
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
interface PaidLeave {
  grantDate: string;             // 有給付与日（YYYY-MM-DD形式）
  days: number;                  // 付与された有給日数
}

interface Employee {
  id: string;                    // 従業員ID（UUID形式推奨）
  firstName: string;             // 姓（最大50文字）
  lastName: string;              // 名（最大50文字）
  employmentType: 'FULL_TIME' | 'PART_TIME';  // 雇用形態コード
  email: string;                 // メールアドレス
  joinDate: string;              // 入社日（YYYY-MM-DD）
  leaveDate: string | null;      // 退社日（YYYY-MM-DD、nullの場合は在籍中）
  allowances: string[];          // 手当IDの配列
  isAdmin: boolean;              // 管理者フラグ
  baseSalary: number;            // 基本給（正社員: 月給、パート: 時給）
  paidLeaves: PaidLeave[];       // 有給情報の配列
  defaultBreakTime: number;      // 基本休憩時間（分単位、30/60/90）
  prescribedWorkHours?: number;  // 所定労働時間（時間単位、パートの場合のみ、1日あたり）
  createdAt: string;             // 作成日時（ISO 8601）
  updatedAt: string;             // 更新日時（ISO 8601）
}
```

---

## 雇用形態コード一覧

雇用形態コードの定義は[employment_types.json](./employment_types.json)を参照してください。

| コード | ラベル | 説明 |
|--------|--------|------|
| `FULL_TIME` | 正社員 | 正社員 |
| `PART_TIME` | パート | パートタイム |

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証（ID Tokenを使用）
2. **権限チェック**: 管理者のみが従業員の作成・更新・削除を実行可能
3. **バリデーション**: メールアドレスの重複チェック、日付形式の検証、基本休憩時間の値チェック（30/60/90のみ許可）
4. **残業代計算**: 正社員の場合、残業単価は `(baseSalary + includeInOvertime=trueの手当金額合計) ÷ 20.5 ÷ 7.5` で計算
   - 詳細は[OVERTIME_CALCULATION_SPEC.md](./OVERTIME_CALCULATION_SPEC.md)を参照
5. **トランザクション**: RDSでの更新処理は適切にトランザクション管理
6. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却
7. **RDS接続**: Lambda関数をVPC内に配置し、セキュリティグループを適切に設定
   - RDS接続エラーのトラブルシューティングは [RDS_CONNECTION_TROUBLESHOOTING.md](./RDS_CONNECTION_TROUBLESHOOTING.md) を参照


