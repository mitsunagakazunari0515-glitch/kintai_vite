# 勤怠API IF仕様書

## 概要

従業員の出勤・退勤打刻、勤怠記録の取得・更新を行うAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/attendance`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 勤怠記録一覧取得

### エンドポイント

```
GET /attendance
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
| employeeId | string | いいえ | 従業員ID（管理者の場合のみ指定可能） |
| startDate | string | いいえ | 開始日（YYYY-MM-DD、デフォルト: 今月初日） |
| endDate | string | いいえ | 終了日（YYYY-MM-DD、デフォルト: 今日） |

#### リクエスト例

```bash
# 従業員自身の勤怠記録を取得
GET /attendance?startDate=2024-01-01&endDate=2024-01-31

# 管理者が特定の従業員の勤怠記録を取得
GET /attendance?employeeId=emp001&startDate=2024-01-01&endDate=2024-01-31
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "logs": [
    {
      "id": "att001",
      "employeeId": "emp001",
      "date": "2024-01-15",
      "clockIn": "2024-01-15T09:00:00Z",
      "clockOut": "2024-01-15T18:00:00Z",
      "breaks": [
        {
          "id": "break001",
          "start": "2024-01-15T12:00:00Z",
          "end": "2024-01-15T13:00:00Z"
        }
      ],
      "status": "退勤済み",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T18:00:00Z"
    }
  ],
  "total": 20
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

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "他の従業員の勤怠記録を取得する権限がありません"
}
```

---

## 2. 勤怠記録詳細取得

### エンドポイント

```
GET /attendance/{attendanceId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| attendanceId | string | はい | 勤怠記録ID |

#### リクエスト例

```bash
GET /attendance/att001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": "2024-01-15T18:00:00Z",
  "breaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "status": "退勤済み",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T18:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された勤怠記録が見つかりません"
}
```

---

## 3. 出勤打刻

### エンドポイント

```
POST /attendance/clock-in
```

### リクエスト

#### リクエストボディ

```json
{
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| date | string | はい | 出勤日（YYYY-MM-DD形式） |
| clockIn | string | いいえ | 出勤時刻（ISO 8601形式、指定しない場合は現在時刻） |

#### リクエスト例

```json
{
  "date": "2024-01-15"
}
```

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": null,
  "breaks": [],
  "status": "出勤中",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T09:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "今日は既に出勤打刻済みです"
}
```

---

## 4. 退勤打刻

### エンドポイント

```
POST /attendance/clock-out
```

### リクエスト

#### リクエストボディ

```json
{
  "date": "2024-01-15",
  "clockOut": "2024-01-15T18:00:00Z"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| date | string | はい | 退勤日（YYYY-MM-DD形式） |
| clockOut | string | いいえ | 退勤時刻（ISO 8601形式、指定しない場合は現在時刻） |

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": "2024-01-15T18:00:00Z",
  "breaks": [],
  "status": "退勤済み",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T18:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "出勤打刻がされていません"
}
```

---

## 5. 休憩開始

### エンドポイント

```
POST /attendance/{attendanceId}/break/start
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| attendanceId | string | はい | 勤怠記録ID |

#### リクエストボディ

```json
{
  "start": "2024-01-15T12:00:00Z"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| start | string | いいえ | 休憩開始時刻（ISO 8601形式、指定しない場合は現在時刻） |

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": null,
  "breaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": null
    }
  ],
  "status": "休憩中",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

## 6. 休憩終了

### エンドポイント

```
POST /attendance/{attendanceId}/break/{breakId}/end
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| attendanceId | string | はい | 勤怠記録ID |
| breakId | string | はい | 休憩ID |

#### リクエストボディ

```json
{
  "end": "2024-01-15T13:00:00Z"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| end | string | いいえ | 休憩終了時刻（ISO 8601形式、指定しない場合は現在時刻） |

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": null,
  "breaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "status": "出勤中",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T13:00:00Z"
}
```

---

## 7. 勤怠記録更新（管理者用）

### エンドポイント

```
PUT /attendance/{attendanceId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| attendanceId | string | はい | 勤怠記録ID |

#### リクエストボディ

```json
{
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": "2024-01-15T18:00:00Z",
  "breaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ]
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| clockIn | string \| null | いいえ | 出勤時刻（ISO 8601形式） |
| clockOut | string \| null | いいえ | 退勤時刻（ISO 8601形式） |
| breaks | Break[] | いいえ | 休憩時間の配列 |

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "att001",
  "employeeId": "emp001",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T09:00:00Z",
  "clockOut": "2024-01-15T18:00:00Z",
  "breaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "status": "退勤済み",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T18:30:00Z"
}
```

#### エラーレスポンス

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "管理者のみが勤怠記録を更新できます"
}
```

---

## データモデル

### AttendanceLog

```typescript
interface AttendanceLog {
  id: string;                    // 勤怠記録ID（UUID形式推奨）
  employeeId: string;            // 従業員ID
  date: string;                  // 出勤日（YYYY-MM-DD）
  clockIn: string | null;        // 出勤時刻（ISO 8601、nullの場合は未出勤）
  clockOut: string | null;       // 退勤時刻（ISO 8601、nullの場合は未退勤）
  breaks: Break[];               // 休憩時間の配列
  status: '未出勤' | '出勤中' | '休憩中' | '退勤済み';  // 勤怠ステータス
  createdAt: string;             // 作成日時（ISO 8601）
  updatedAt: string;             // 更新日時（ISO 8601）
}

interface Break {
  id: string;                    // 休憩ID（UUID形式推奨）
  start: string;                 // 休憩開始時刻（ISO 8601）
  end: string | null;            // 休憩終了時刻（ISO 8601、nullの場合は休憩中）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 従業員は自分の勤怠記録のみ操作可能、管理者は全従業員の記録を操作可能
3. **バリデーション**: 
   - 同一日の重複打刻を防止
   - 退勤時刻が出勤時刻より後であることを確認
   - 休憩時間が勤務時間内であることを確認
4. **ステータス管理**: 打刻に応じて自動的にステータスを更新
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却

