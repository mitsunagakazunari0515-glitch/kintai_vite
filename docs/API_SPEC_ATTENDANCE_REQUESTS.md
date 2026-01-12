# 打刻修正申請API IF仕様書

## 概要

従業員の勤怠打刻修正申請の作成、取得、承認・却下を行うAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/attendance-requests`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 打刻修正申請一覧取得

### エンドポイント

```
GET /attendance-requests
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
| status | string | いいえ | ステータスでフィルタ（`申請中` / `承認` / `取消` / `削除済み`） |
| startDate | string | いいえ | 開始日以降でフィルタ（YYYY-MM-DD） |
| endDate | string | いいえ | 終了日以前でフィルタ（YYYY-MM-DD） |

#### リクエスト例

```bash
# 従業員自身の打刻修正申請を取得
GET /attendance-requests

# 管理者が特定の従業員の打刻修正申請を取得
GET /attendance-requests?employeeId=emp001&status=申請中
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "requests": [
    {
      "id": "ar001",
      "employeeId": "emp001",
      "employeeName": "山田 太郎",
      "date": "2024-01-15",
      "originalClockIn": "2024-01-15T09:00:00Z",
      "originalClockOut": "2024-01-15T18:00:00Z",
      "requestedClockIn": "2024-01-15T08:50:00Z",
      "requestedClockOut": "2024-01-15T18:10:00Z",
      "requestedBreaks": [
        {
          "id": "break001",
          "start": "2024-01-15T12:00:00Z",
          "end": "2024-01-15T13:00:00Z"
        }
      ],
      "reason": "出勤時刻を忘れていました",
      "status": "承認",
      "requestedAt": "2024-01-16T10:00:00Z",
      "approvedAt": "2024-01-16T14:00:00Z",
      "approvedBy": "admin001",
      "createdAt": "2024-01-16T10:00:00Z",
      "updatedAt": "2024-01-16T14:00:00Z"
    }
  ],
  "total": 5
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
  "message": "他の従業員の打刻修正申請を取得する権限がありません"
}
```

---

## 2. 打刻修正申請詳細取得

### エンドポイント

```
GET /attendance-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 打刻修正申請ID |

#### リクエスト例

```bash
GET /attendance-requests/ar001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "ar001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "date": "2024-01-15",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T18:00:00Z",
  "requestedClockIn": "2024-01-15T08:50:00Z",
  "requestedClockOut": "2024-01-15T18:10:00Z",
  "requestedBreaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を忘れていました",
  "status": "承認",
  "requestedAt": "2024-01-16T10:00:00Z",
  "approvedAt": "2024-01-16T14:00:00Z",
  "approvedBy": "admin001",
  "createdAt": "2024-01-16T10:00:00Z",
  "updatedAt": "2024-01-16T14:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された打刻修正申請が見つかりません"
}
```

---

## 3. 打刻修正申請作成

### エンドポイント

```
POST /attendance-requests
```

### リクエスト

#### リクエストボディ

```json
{
  "date": "2024-01-15",
  "requestedClockIn": "2024-01-15T08:50:00Z",
  "requestedClockOut": "2024-01-15T18:10:00Z",
  "requestedBreaks": [
    {
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を忘れていました"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| date | string | はい | 修正対象の日付（YYYY-MM-DD形式） |
| requestedClockIn | string | いいえ | 申請する出勤時刻（ISO 8601形式） |
| requestedClockOut | string | いいえ | 申請する退勤時刻（ISO 8601形式） |
| requestedBreaks | BreakRequest[] | いいえ | 申請する休憩時間の配列 |
| reason | string | はい | 修正理由（最大500文字） |

#### BreakRequest

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| start | string | はい | 休憩開始時刻（ISO 8601形式） |
| end | string | いいえ | 休憩終了時刻（ISO 8601形式、nullの場合は休憩中） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "ar001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "date": "2024-01-15",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T18:00:00Z",
  "requestedClockIn": "2024-01-15T08:50:00Z",
  "requestedClockOut": "2024-01-15T18:10:00Z",
  "requestedBreaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を忘れていました",
  "status": "申請中",
  "requestedAt": "2024-01-16T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-16T10:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "指定された日付の勤怠記録が見つかりません",
  "details": [
    {
      "field": "date",
      "message": "2024-01-15の勤怠記録が存在しません"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "指定された日付に既に打刻修正申請が存在します"
}
```

---

## 4. 打刻修正申請更新

### エンドポイント

```
PUT /attendance-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 打刻修正申請ID |

#### リクエストボディ

```json
{
  "requestedClockIn": "2024-01-15T08:45:00Z",
  "requestedClockOut": "2024-01-15T18:15:00Z",
  "requestedBreaks": [
    {
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を再度修正しました"
}
```

#### リクエストボディのスキーマ

（打刻修正申請作成と同じ、ただし`date`は変更不可）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "ar001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "date": "2024-01-15",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T18:00:00Z",
  "requestedClockIn": "2024-01-15T08:45:00Z",
  "requestedClockOut": "2024-01-15T18:15:00Z",
  "requestedBreaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を再度修正しました",
  "status": "申請中",
  "requestedAt": "2024-01-16T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "createdAt": "2024-01-16T10:00:00Z",
  "updatedAt": "2024-01-16T11:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "承認済みの申請は更新できません"
}
```

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "自分の申請のみ更新できます"
}
```

---

## 5. 打刻修正申請削除

### エンドポイント

```
DELETE /attendance-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 打刻修正申請ID |

#### リクエスト例

```bash
DELETE /attendance-requests/ar001
```

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "承認済みの申請は削除できません"
}
```

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "自分の申請のみ削除できます"
}
```

---

## 6. 打刻修正申請承認（管理者用）

### エンドポイント

```
POST /attendance-requests/{requestId}/approve
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 打刻修正申請ID |

#### リクエスト例

```bash
POST /attendance-requests/ar001/approve
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "ar001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "date": "2024-01-15",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T18:00:00Z",
  "requestedClockIn": "2024-01-15T08:50:00Z",
  "requestedClockOut": "2024-01-15T18:10:00Z",
  "requestedBreaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を忘れていました",
  "status": "承認",
  "requestedAt": "2024-01-16T10:00:00Z",
  "approvedAt": "2024-01-16T14:00:00Z",
  "approvedBy": "admin001",
  "createdAt": "2024-01-16T10:00:00Z",
  "updatedAt": "2024-01-16T14:00:00Z"
}
```

**注意**: 承認時に、該当する勤怠記録（`/attendance`）が自動的に更新されます。

#### エラーレスポンス

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "管理者のみが承認できます"
}
```

---

## 7. 打刻修正申請却下（管理者用）

### エンドポイント

```
POST /attendance-requests/{requestId}/reject
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 打刻修正申請ID |

#### リクエストボディ

```json
{
  "rejectionReason": "修正理由が不十分です"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| rejectionReason | string | いいえ | 却下理由（最大500文字） |

#### リクエスト例

```bash
POST /attendance-requests/ar001/reject
Content-Type: application/json

{
  "rejectionReason": "修正理由が不十分です"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "ar001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "date": "2024-01-15",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T18:00:00Z",
  "requestedClockIn": "2024-01-15T08:50:00Z",
  "requestedClockOut": "2024-01-15T18:10:00Z",
  "requestedBreaks": [
    {
      "id": "break001",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z"
    }
  ],
  "reason": "出勤時刻を忘れていました",
  "status": "取消",
  "requestedAt": "2024-01-16T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "rejectionReason": "修正理由が不十分です",
  "createdAt": "2024-01-16T10:00:00Z",
  "updatedAt": "2024-01-16T15:00:00Z"
}
```

#### エラーレスポンス

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "管理者のみが却下できます"
}
```

---

## データモデル

### AttendanceRequest

```typescript
interface AttendanceRequest {
  id: string;                          // 打刻修正申請ID（UUID形式推奨）
  employeeId: string;                  // 従業員ID
  employeeName: string;                // 従業員名
  date: string;                        // 修正対象の日付（YYYY-MM-DD）
  originalClockIn: string | null;      // 元の出勤時刻（ISO 8601）
  originalClockOut: string | null;     // 元の退勤時刻（ISO 8601）
  requestedClockIn: string | null;     // 申請する出勤時刻（ISO 8601）
  requestedClockOut: string | null;    // 申請する退勤時刻（ISO 8601）
  requestedBreaks: BreakRequest[];     // 申請する休憩時間の配列
  reason: string;                      // 修正理由
  status: '申請中' | '承認' | '取消' | '削除済み';  // 申請ステータス
  requestedAt: string;                 // 申請日時（ISO 8601）
  approvedAt: string | null;           // 承認日時（ISO 8601）
  approvedBy: string | null;           // 承認者ID
  rejectionReason?: string;            // 却下理由
  createdAt: string;                   // 作成日時（ISO 8601）
  updatedAt: string;                   // 更新日時（ISO 8601）
}

interface BreakRequest {
  id: string;                          // 休憩ID（UUID形式推奨）
  start: string;                       // 休憩開始時刻（ISO 8601）
  end: string | null;                  // 休憩終了時刻（ISO 8601、nullの場合は休憩中）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 
   - 従業員は自分の申請のみ作成・更新・削除可能
   - 管理者のみが承認・却下可能
3. **バリデーション**: 
   - 指定された日付の勤怠記録が存在することを確認
   - 退勤時刻が出勤時刻より後であることを確認
   - 休憩時間が勤務時間内であることを確認
   - 承認時に勤怠記録を自動的に更新
4. **トランザクション**: 承認時に勤怠記録の更新も含めてトランザクション管理
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却








