# 控除マスタAPI IF仕様書

## 概要

給与明細で使用する控除項目のマスタデータを管理するAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/deductions`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 控除マスタ一覧取得

### エンドポイント

```
GET /deductions
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### リクエスト例

```bash
GET /deductions
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "deductions": [
    {
      "id": "deduction001",
      "name": "健康保険料",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": "deduction002",
      "name": "厚生年金保険料",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 2
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

---

## 2. 控除マスタ詳細取得

### エンドポイント

```
GET /deductions/{deductionId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| deductionId | string | はい | 控除ID |

#### リクエスト例

```bash
GET /deductions/deduction001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "deduction001",
  "name": "健康保険料",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された控除が見つかりません"
}
```

---

## 3. 控除マスタ作成

### エンドポイント

```
POST /deductions
```

### リクエスト

#### リクエストボディ

```json
{
  "name": "健康保険料"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | はい | 控除名（最大100文字、重複不可） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "deduction001",
  "name": "健康保険料",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
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
      "field": "name",
      "message": "控除名は必須です"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "同じ名前の控除が既に登録されています"
}
```

---

## 4. 控除マスタ更新

### エンドポイント

```
PUT /deductions/{deductionId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| deductionId | string | はい | 控除ID |

#### リクエストボディ

```json
{
  "name": "健康保険料（更新）"
}
```

#### リクエストボディのスキーマ

（控除マスタ作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "deduction001",
  "name": "健康保険料（更新）",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された控除が見つかりません"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "同じ名前の控除が既に登録されています"
}
```

---

## 5. 控除マスタ削除

### エンドポイント

```
DELETE /deductions/{deductionId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| deductionId | string | はい | 控除ID |

#### リクエスト例

```bash
DELETE /deductions/deduction001
```

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された控除が見つかりません"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "この控除は給与明細で使用されているため削除できません"
}
```

---

## データモデル

### Deduction

```typescript
interface Deduction {
  id: string;          // 控除ID（UUID形式推奨）
  name: string;        // 控除名
  createdAt: string;   // 作成日時（ISO 8601）
  updatedAt: string;   // 更新日時（ISO 8601）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 管理者のみが控除マスタの作成・更新・削除を実行可能（参照は全ユーザー可能）
3. **バリデーション**: 
   - 控除名の重複チェック
   - 控除名が空でないことを確認
4. **削除制限**: 給与明細で使用されている控除は削除不可（外部キー制約の確認）
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却








