# API仕様書一覧

勤怠管理システムのAPI仕様書一覧です。各APIの詳細は個別の仕様書を参照してください。

## 概要

- **ベースURL**: `{API_ENDPOINT}`（環境変数 `VITE_API_ENDPOINT` または `VITE_API_ENDPOINT_PRODUCTION` で設定）
- **認証方式**: AWS Cognito User Poolのアクセストークン（`Authorization: Bearer {access_token}`）
- **データ形式**: JSON（Content-Type: `application/json`）
- **文字エンコーディング**: UTF-8

## API一覧

### 1. 認証認可API

Cognitoでの認証後、従業員情報を取得してロール（管理者/従業員）を判定するAPIです。

- [認証認可API IF仕様書](./API_SPEC_AUTH.md)

**エンドポイント一覧**:
- `GET /auth/authorize` - 認可情報取得
- `POST /auth/refresh-authorization` - 認可情報更新（トークンリフレッシュ時）

---

### 2. 従業員API

従業員情報の取得、作成、更新、削除を行うAPIです。

- [従業員API IF仕様書](./API_SPEC_EMPLOYEES.md)

**エンドポイント一覧**:
- `GET /employees` - 従業員一覧取得
- `GET /employees/{employeeId}` - 従業員詳細取得
- `POST /employees` - 従業員作成
- `PUT /employees/{employeeId}` - 従業員更新
- `DELETE /employees/{employeeId}` - 従業員削除

---

### 3. 勤怠API

従業員の出勤・退勤打刻、勤怠記録の取得・更新を行うAPIです。

- [勤怠API IF仕様書](./API_SPEC_ATTENDANCE.md)

**エンドポイント一覧**:
- `GET /attendance` - 勤怠記録一覧取得
- `GET /attendance/{attendanceId}` - 勤怠記録詳細取得
- `POST /attendance/clock-in` - 出勤打刻
- `POST /attendance/clock-out` - 退勤打刻
- `POST /attendance/{attendanceId}/break/start` - 休憩開始
- `POST /attendance/{attendanceId}/break/{breakId}/end` - 休憩終了
- `PUT /attendance/{attendanceId}` - 勤怠記録更新（管理者用）
- `PATCH /attendance/{attendanceId}/memo` - 勤怠記録メモ更新

---

### 4. 休暇申請API

従業員の休暇申請の作成、取得、更新、承認・却下を行うAPIです。

- [休暇申請API IF仕様書](./API_SPEC_LEAVE_REQUESTS.md)

**エンドポイント一覧**:
- `GET /leave-requests` - 休暇申請一覧取得
- `GET /leave-requests/{requestId}` - 休暇申請詳細取得
- `POST /leave-requests` - 休暇申請作成
- `PUT /leave-requests/{requestId}` - 休暇申請更新
- `DELETE /leave-requests/{requestId}` - 休暇申請削除
- `POST /leave-requests/{requestId}/approve` - 休暇申請承認（管理者用）
- `POST /leave-requests/{requestId}/reject` - 休暇申請却下（管理者用）

---

### 5. 打刻修正申請API

従業員の勤怠打刻修正申請の作成、取得、承認・却下を行うAPIです。

- [打刻修正申請API IF仕様書](./API_SPEC_ATTENDANCE_REQUESTS.md)

**エンドポイント一覧**:
- `GET /attendance-requests` - 打刻修正申請一覧取得
- `GET /attendance-requests/{requestId}` - 打刻修正申請詳細取得
- `POST /attendance-requests` - 打刻修正申請作成
- `PUT /attendance-requests/{requestId}` - 打刻修正申請更新
- `DELETE /attendance-requests/{requestId}` - 打刻修正申請削除
- `POST /attendance-requests/{requestId}/approve` - 打刻修正申請承認（管理者用）
- `POST /attendance-requests/{requestId}/reject` - 打刻修正申請却下（管理者用）

---

### 6. 給与明細API

給与明細の作成、取得、更新、削除を行うAPIです。

- [給与明細API IF仕様書](./API_SPEC_PAYROLL.md)

**エンドポイント一覧**:
- `GET /payroll` - 給与明細一覧取得
- `GET /payroll/{payrollId}` - 給与明細詳細取得
- `POST /payroll` - 給与明細作成
- `PUT /payroll/{payrollId}` - 給与明細更新
- `DELETE /payroll/{payrollId}` - 給与明細削除
- `PATCH /payroll/{payrollId}/memo` - 給与明細メモ更新
- `POST /payroll/calculate-overtime` - 残業代計算

**関連仕様書**:
- [残業代計算仕様書](./OVERTIME_CALCULATION_SPEC.md)

---

### 7. 手当マスタAPI

従業員に付与する手当のマスタデータを管理するAPIです。

- [手当マスタAPI IF仕様書](./API_SPEC_ALLOWANCES.md)

**エンドポイント一覧**:
- `GET /allowances` - 手当マスタ一覧取得
- `GET /allowances/{allowanceId}` - 手当マスタ詳細取得
- `POST /allowances` - 手当マスタ作成
- `PUT /allowances/{allowanceId}` - 手当マスタ更新
- `DELETE /allowances/{allowanceId}` - 手当マスタ削除

---

### 8. 控除マスタAPI

給与明細で使用する控除項目のマスタデータを管理するAPIです。

- [控除マスタAPI IF仕様書](./API_SPEC_DEDUCTIONS.md)

**エンドポイント一覧**:
- `GET /deductions` - 控除マスタ一覧取得
- `GET /deductions/{deductionId}` - 控除マスタ詳細取得
- `POST /deductions` - 控除マスタ作成
- `PUT /deductions/{deductionId}` - 控除マスタ更新
- `DELETE /deductions/{deductionId}` - 控除マスタ削除

---

## 共通仕様

### 認証

すべてのAPIエンドポイントで、リクエストヘッダーに以下の形式で認証トークンを付与する必要があります。

```
Authorization: Bearer {access_token}
```

アクセストークンは、AWS Cognito User Poolから取得したJWTトークンです。

### エラーレスポンス

エラーが発生した場合、以下の形式でエラーレスポンスを返却します。

```json
{
  "error": "ErrorCode",
  "message": "エラーメッセージ",
  "details": [
    {
      "field": "fieldName",
      "message": "フィールド単位のエラーメッセージ"
    }
  ]
}
```

### HTTPステータスコード

- `200 OK` - リクエスト成功
- `201 Created` - リソース作成成功
- `204 No Content` - リクエスト成功（レスポンスボディなし）
- `400 Bad Request` - リクエストが不正
- `401 Unauthorized` - 認証が必要、または認証トークンが無効
- `403 Forbidden` - 権限が不足している
- `404 Not Found` - リソースが見つからない
- `409 Conflict` - リソースの競合（重複など）
- `500 Internal Server Error` - サーバーエラー

### 日付形式

- 日付: `YYYY-MM-DD`形式（例: `2024-01-15`）
- 日時: ISO 8601形式（例: `2024-01-15T10:00:00Z`）

### 権限

- **管理者**: すべてのAPIエンドポイントにアクセス可能
- **従業員**: 
  - 自分のデータのみ取得・更新可能
  - 申請の作成・更新・削除が可能
  - マスタデータの参照は可能、作成・更新・削除は不可

## Lambda関数実装時の共通注意事項

1. **Cognito認証の検証**: すべてのリクエストで認証トークンを検証
2. **権限チェック**: ユーザーのロール（管理者/従業員）に応じた権限チェック
3. **バリデーション**: リクエストボディの必須項目チェック、データ型チェック、形式チェック
4. **トランザクション管理**: RDSでの更新処理は適切にトランザクション管理
5. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却
6. **ログ出力**: エラー発生時は適切にログを出力（CloudWatch Logs）
7. **CORS設定**: フロントエンドからのリクエストを許可するCORS設定

## データベース設計

各APIのデータモデルは、個別の仕様書を参照してください。RDS（PostgreSQL/MySQL）を使用する場合、以下のテーブル構成を想定しています。

- `employees` - 従業員テーブル
- `attendance_logs` - 勤怠記録テーブル
- `breaks` - 休憩時間テーブル
- `leave_requests` - 休暇申請テーブル
- `attendance_requests` - 打刻修正申請テーブル
- `payroll_records` - 給与明細テーブル
- `allowances` - 手当マスタテーブル
- `deductions` - 控除マスタテーブル

詳細なスキーマ設計は別途資料を参照してください。


