# 手当マスタAPI IF仕様書

## 概要

従業員に付与する手当のマスタデータを管理するAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/allowances`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 手当マスタ一覧取得

### エンドポイント

```
GET /allowances
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### リクエスト例

```bash
GET /allowances
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "allowances": [
    {
      "id": "allowance001",
      "name": "資格手当",
      "color": "#3b82f6",
      "includeInOvertime": false,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": "allowance002",
      "name": "役職手当",
      "color": "#10b981",
      "includeInOvertime": true,
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

## 2. 手当マスタ詳細取得

### エンドポイント

```
GET /allowances/{allowanceId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| allowanceId | string | はい | 手当ID |

#### リクエスト例

```bash
GET /allowances/allowance001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "allowance001",
  "name": "資格手当",
  "color": "#3b82f6",
  "includeInOvertime": false,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された手当が見つかりません"
}
```

---

## 3. 手当マスタ作成

### エンドポイント

```
POST /allowances
```

### リクエスト

#### リクエストボディ

```json
{
  "name": "資格手当",
  "color": "#3b82f6",
  "includeInOvertime": false
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| name | string | はい | 手当名（最大100文字、重複不可） |
| color | string | はい | 手当の表示色（16進数カラーコード、例: "#3b82f6"） |
| includeInOvertime | boolean | いいえ | 残業代に含むかどうか（デフォルト: false） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "allowance001",
  "name": "資格手当",
  "color": "#3b82f6",
  "includeInOvertime": false,
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
      "message": "手当名は必須です"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "同じ名前の手当が既に登録されています"
}
```

---

## 4. 手当マスタ更新

### エンドポイント

```
PUT /allowances/{allowanceId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| allowanceId | string | はい | 手当ID |

#### リクエストボディ

```json
{
  "name": "資格手当（更新）",
  "color": "#10b981",
  "includeInOvertime": true
}
```

#### リクエストボディのスキーマ

（手当マスタ作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "allowance001",
  "name": "資格手当（更新）",
  "color": "#10b981",
  "includeInOvertime": true,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された手当が見つかりません"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "同じ名前の手当が既に登録されています"
}
```

---

## 5. 手当マスタ削除

### エンドポイント

```
DELETE /allowances/{allowanceId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| allowanceId | string | はい | 手当ID |

#### リクエスト例

```bash
DELETE /allowances/allowance001
```

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された手当が見つかりません"
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "この手当は給与明細で使用されているため削除できません"
}
```

---

## データモデル

### Allowance

```typescript
interface Allowance {
  id: string;                    // 手当ID（UUID形式推奨）
  name: string;                  // 手当名
  color: string;                 // 手当の表示色（16進数カラーコード）
  includeInOvertime: boolean;    // 残業代に含むかどうか
  createdAt: string;             // 作成日時（ISO 8601）
  updatedAt: string;             // 更新日時（ISO 8601）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 管理者のみが手当マスタの作成・更新・削除を実行可能（参照は全ユーザー可能）
3. **バリデーション**: 
   - 手当名の重複チェック
   - カラーコードの形式チェック（#RRGGBB形式）
   - 手当名が空でないことを確認
4. **削除制限**: 給与明細で使用されている手当は削除不可（外部キー制約の確認）
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却


