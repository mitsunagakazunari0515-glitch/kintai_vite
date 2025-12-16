# 休暇申請API IF仕様書

## 概要

従業員の休暇申請の作成、取得、更新、承認・却下を行うAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/leave-requests`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 休暇申請一覧取得

### エンドポイント

```
GET /leave-requests
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
| leaveType | string | いいえ | 休暇種別でフィルタ（`有給` / `特別休暇` / `病気休暇` / `欠勤` / `その他`） |
| fiscalYear | number | いいえ | 会計年度でフィルタ |
| startDate | string | いいえ | 開始日以降でフィルタ（YYYY-MM-DD） |
| endDate | string | いいえ | 終了日以前でフィルタ（YYYY-MM-DD） |

#### リクエスト例

```bash
# 従業員自身の休暇申請を取得
GET /leave-requests?fiscalYear=2024

# 管理者が特定の従業員の休暇申請を取得
GET /leave-requests?employeeId=emp001&status=申請中
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "requests": [
    {
      "id": "lr001",
      "employeeId": "emp001",
      "employeeName": "山田 太郎",
      "startDate": "2024-01-20",
      "endDate": "2024-01-22",
      "days": 3,
      "leaveType": "有給",
      "reason": "家族旅行",
      "isHalfDay": false,
      "status": "承認",
      "requestedAt": "2024-01-10T10:00:00Z",
      "approvedAt": "2024-01-11T14:00:00Z",
      "approvedBy": "admin001",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-11T14:00:00Z"
    }
  ],
  "total": 10
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
  "message": "他の従業員の休暇申請を取得する権限がありません"
}
```

---

## 2. 休暇申請詳細取得

### エンドポイント

```
GET /leave-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 休暇申請ID |

#### リクエスト例

```bash
GET /leave-requests/lr001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "lr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "days": 3,
  "leaveType": "有給",
  "reason": "家族旅行",
  "isHalfDay": false,
  "status": "承認",
  "requestedAt": "2024-01-10T10:00:00Z",
  "approvedAt": "2024-01-11T14:00:00Z",
  "approvedBy": "admin001",
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-11T14:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された休暇申請が見つかりません"
}
```

---

## 3. 休暇申請作成

### エンドポイント

```
POST /leave-requests
```

### リクエスト

#### リクエストボディ

```json
{
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "leaveType": "有給",
  "reason": "家族旅行",
  "isHalfDay": false
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| startDate | string | はい | 開始日（YYYY-MM-DD形式） |
| endDate | string | はい | 終了日（YYYY-MM-DD形式、`isHalfDay`が`true`の場合は`startDate`と同じ） |
| leaveType | string | はい | 休暇種別（`有給` / `特別休暇` / `病気休暇` / `欠勤` / `その他`） |
| reason | string | はい | 理由（最大500文字） |
| isHalfDay | boolean | いいえ | 半休かどうか（デフォルト: `false`） |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "lr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "days": 3,
  "leaveType": "有給",
  "reason": "家族旅行",
  "isHalfDay": false,
  "status": "申請中",
  "requestedAt": "2024-01-10T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-10T10:00:00Z"
}
```

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "有給残日数が不足しています",
  "details": [
    {
      "field": "days",
      "message": "申請日数（3日）が有給残日数（2日）を超えています"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "指定された期間に既に休暇申請が存在します"
}
```

---

## 4. 休暇申請更新

### エンドポイント

```
PUT /leave-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 休暇申請ID |

#### リクエストボディ

```json
{
  "startDate": "2024-01-21",
  "endDate": "2024-01-23",
  "leaveType": "有給",
  "reason": "家族旅行（日程変更）",
  "isHalfDay": false
}
```

#### リクエストボディのスキーマ

（休暇申請作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "lr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "startDate": "2024-01-21",
  "endDate": "2024-01-23",
  "days": 3,
  "leaveType": "有給",
  "reason": "家族旅行（日程変更）",
  "isHalfDay": false,
  "status": "申請中",
  "requestedAt": "2024-01-10T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
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

## 5. 休暇申請削除

### エンドポイント

```
DELETE /leave-requests/{requestId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 休暇申請ID |

#### リクエスト例

```bash
DELETE /leave-requests/lr001
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

## 6. 休暇申請承認（管理者用）

### エンドポイント

```
POST /leave-requests/{requestId}/approve
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 休暇申請ID |

#### リクエスト例

```bash
POST /leave-requests/lr001/approve
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "lr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "days": 3,
  "leaveType": "有給",
  "reason": "家族旅行",
  "isHalfDay": false,
  "status": "承認",
  "requestedAt": "2024-01-10T10:00:00Z",
  "approvedAt": "2024-01-11T14:00:00Z",
  "approvedBy": "admin001",
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-11T14:00:00Z"
}
```

#### エラーレスポンス

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "管理者のみが承認できます"
}
```

---

## 7. 休暇申請却下（管理者用）

### エンドポイント

```
POST /leave-requests/{requestId}/reject
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| requestId | string | はい | 休暇申請ID |

#### リクエストボディ

```json
{
  "rejectionReason": "有給残日数が不足しています"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| rejectionReason | string | いいえ | 却下理由（最大500文字） |

#### リクエスト例

```bash
POST /leave-requests/lr001/reject
Content-Type: application/json

{
  "rejectionReason": "有給残日数が不足しています"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "lr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "days": 3,
  "leaveType": "有給",
  "reason": "家族旅行",
  "isHalfDay": false,
  "status": "取消",
  "requestedAt": "2024-01-10T10:00:00Z",
  "approvedAt": null,
  "approvedBy": null,
  "rejectionReason": "有給残日数が不足しています",
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-11T15:00:00Z"
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

### LeaveRequest

```typescript
interface LeaveRequest {
  id: string;                          // 休暇申請ID（UUID形式推奨）
  employeeId: string;                  // 従業員ID
  employeeName: string;                // 従業員名
  startDate: string;                   // 開始日（YYYY-MM-DD）
  endDate: string;                     // 終了日（YYYY-MM-DD）
  days: number;                        // 日数（半休の場合は0.5）
  leaveType: '有給' | '特別休暇' | '病気休暇' | '欠勤' | 'その他';  // 休暇種別
  reason: string;                      // 理由
  isHalfDay: boolean;                  // 半休かどうか
  status: '申請中' | '承認' | '取消' | '削除済み';  // 申請ステータス
  requestedAt: string;                 // 申請日時（ISO 8601）
  approvedAt: string | null;           // 承認日時（ISO 8601）
  approvedBy: string | null;           // 承認者ID
  rejectionReason?: string;            // 却下理由
  createdAt: string;                   // 作成日時（ISO 8601）
  updatedAt: string;                   // 更新日時（ISO 8601）
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 
   - 従業員は自分の申請のみ作成・更新・削除可能
   - 管理者のみが承認・却下可能
3. **バリデーション**: 
   - 有給残日数の確認（有給の場合）
   - 期間の重複チェック
   - 開始日が終了日より前であることを確認
   - 半休の場合は終了日が開始日と同じであることを確認
4. **有給残日数の更新**: 承認時に有給残日数を減算
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却

