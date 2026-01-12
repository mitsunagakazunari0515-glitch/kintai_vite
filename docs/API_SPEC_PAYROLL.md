# 給与明細API IF仕様書

## 概要

給与明細の作成、取得、更新、削除を行うAPI仕様です。

**ベースURL**: `{API_ENDPOINT}/payroll`

**認証**: すべてのエンドポイントでCognito User Poolのアクセストークンが必要です。

---

## 1. 給与明細一覧取得

### エンドポイント

```
GET /payroll
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
| employeeId | string | いいえ | 従業員ID（管理者の場合のみ指定可能、指定しない場合は自分の給与明細のみ） |
| fiscalYear | number | いいえ | 会計年度でフィルタ |
| year | number | いいえ | 年でフィルタ（YYYY形式） |
| month | number | いいえ | 月でフィルタ（1-12） |

#### リクエスト例

```bash
# 従業員自身の給与明細を取得
GET /payroll?fiscalYear=2024

# 管理者が特定の従業員の給与明細を取得
GET /payroll?employeeId=emp001&year=2024&month=1
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "records": [
    {
      "id": "pr001",
      "employeeId": "emp001",
      "employeeName": "山田 太郎",
      "companyName": "株式会社A・1インテリア",
      "period": "2024年 1月",
      "detail": {
        "workingDays": 22,
        "holidayWork": 0,
        "paidLeave": 2,
        "paidLeaveRemaining": 18,
        "paidLeaveRemainingDate": "2024-01-31",
        "normalOvertime": 10,
        "lateNightOvertime": 2,
        "baseSalary": 300000,
        "overtimeAllowance": 50000,
        "lateNightAllowance": 10000,
        "mealAllowance": 5000,
        "commutingAllowance": 15000,
        "housingAllowance": 20000,
        "allowances": {
          "allowance001": 10000,
          "allowance002": 5000
        },
        "totalEarnings": 405000,
        "socialInsurance": 50000,
        "employeePension": 40000,
        "employmentInsurance": 2000,
        "municipalTax": 15000,
        "incomeTax": 10000,
        "deductions": {
          "deduction001": 3000
        },
        "totalDeductions": 120000,
        "netPay": 285000
      },
      "createdAt": "2024-02-01T10:00:00Z",
      "updatedAt": "2024-02-01T10:00:00Z"
    }
  ],
  "total": 12
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
  "message": "他の従業員の給与明細を取得する権限がありません"
}
```

---

## 2. 給与明細詳細取得

### エンドポイント

```
GET /payroll/{payrollId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| payrollId | string | はい | 給与明細ID |

#### リクエスト例

```bash
GET /payroll/pr001
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "pr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "companyName": "株式会社A・1インテリア",
  "period": "2024年 1月",
  "detail": {
    "workingDays": 22,
    "holidayWork": 0,
    "paidLeave": 2,
    "paidLeaveRemaining": 18,
    "paidLeaveRemainingDate": "2024-01-31",
    "normalOvertime": 10,
    "lateNightOvertime": 2,
    "baseSalary": 300000,
    "overtimeAllowance": 50000,
    "lateNightAllowance": 10000,
    "mealAllowance": 5000,
    "commutingAllowance": 15000,
    "housingAllowance": 20000,
    "allowances": {
      "allowance001": 10000,
      "allowance002": 5000
    },
    "totalEarnings": 405000,
    "socialInsurance": 50000,
    "employeePension": 40000,
    "employmentInsurance": 2000,
    "municipalTax": 15000,
    "incomeTax": 10000,
    "deductions": {
      "deduction001": 3000
    },
    "totalDeductions": 120000,
    "netPay": 285000
  },
  "createdAt": "2024-02-01T10:00:00Z",
  "updatedAt": "2024-02-01T10:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された給与明細が見つかりません"
}
```

---

## 3. 給与明細作成

### エンドポイント

```
POST /payroll
```

### リクエスト

#### リクエストボディ

```json
{
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "companyName": "株式会社A・1インテリア",
  "period": "2024年 1月",
  "detail": {
    "workingDays": 22,
    "holidayWork": 0,
    "paidLeave": 2,
    "paidLeaveRemaining": 18,
    "paidLeaveRemainingDate": "2024-01-31",
    "normalOvertime": 10,
    "lateNightOvertime": 2,
    "baseSalary": 300000,
    "overtimeAllowance": 50000,
    "lateNightAllowance": 10000,
    "mealAllowance": 5000,
    "commutingAllowance": 15000,
    "housingAllowance": 20000,
    "allowances": {
      "allowance001": 10000,
      "allowance002": 5000
    },
    "totalEarnings": 405000,
    "socialInsurance": 50000,
    "employeePension": 40000,
    "employmentInsurance": 2000,
    "municipalTax": 15000,
    "incomeTax": 10000,
    "deductions": {
      "deduction001": 3000
    },
    "totalDeductions": 120000,
    "netPay": 285000
  }
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |
| employeeName | string | はい | 従業員名 |
| companyName | string | はい | 会社名 |
| period | string | はい | 給与期間（例: "2024年 1月"） |
| detail | PayrollDetail | はい | 給与明細の詳細情報 |

#### PayrollDetail

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| workingDays | number | はい | 出勤日数 |
| holidayWork | number | いいえ | 休日出勤日数（デフォルト: 0） |
| paidLeave | number | いいえ | 有給休暇日数（デフォルト: 0） |
| paidLeaveRemaining | number | いいえ | 有給残日数 |
| paidLeaveRemainingDate | string | いいえ | 有給残の時点（YYYY-MM-DD） |
| normalOvertime | number | いいえ | 普通残業時間（時間単位、後方互換性のため残す、デフォルト: 0） |
| lateNightOvertime | number | いいえ | 深夜残業時間（時間単位、後方互換性のため残す、デフォルト: 0） |
| baseSalary | number | はい | 基本給（正社員: 月給、パート: 時給） |
| overtimeAllowance | number | いいえ | 時間外手当（合計、円単位、デフォルト: 0）<br>※残業代計算により自動計算される |
| lateNightAllowance | number | いいえ | 深夜手当（後方互換性のため残す、デフォルト: 0） |
| mealAllowance | number | いいえ | 食事手当（デフォルト: 0） |
| commutingAllowance | number | いいえ | 交通費（デフォルト: 0） |
| housingAllowance | number | いいえ | 住宅手当（デフォルト: 0） |
| allowances | object | いいえ | 手当IDをキーとした金額のマップ |
| overtimeCalculation | OvertimeCalculation | いいえ | 残業代計算結果（監査用、オプション）<br>※詳細は[OVERTIME_CALCULATION_SPEC.md](./OVERTIME_CALCULATION_SPEC.md)を参照 |
| totalEarnings | number | はい | 総支給額 |
| socialInsurance | number | いいえ | 社会保険料（デフォルト: 0） |
| employeePension | number | いいえ | 厚生年金保険料（デフォルト: 0） |
| employmentInsurance | number | いいえ | 雇用保険料（デフォルト: 0） |
| municipalTax | number | いいえ | 市県民税（デフォルト: 0） |
| incomeTax | number | いいえ | 所得税（デフォルト: 0） |
| deductions | object | いいえ | 控除IDをキーとした金額のマップ |
| totalDeductions | number | はい | 控除合計 |
| netPay | number | はい | 差引支給額 |

### レスポンス

#### 成功時（201 Created）

```json
{
  "id": "pr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "companyName": "株式会社A・1インテリア",
  "period": "2024年 1月",
  "detail": {
    "workingDays": 22,
    "holidayWork": 0,
    "paidLeave": 2,
    "paidLeaveRemaining": 18,
    "paidLeaveRemainingDate": "2024-01-31",
    "normalOvertime": 10,
    "lateNightOvertime": 2,
    "baseSalary": 300000,
    "overtimeAllowance": 50000,
    "lateNightAllowance": 10000,
    "mealAllowance": 5000,
    "commutingAllowance": 15000,
    "housingAllowance": 20000,
    "allowances": {
      "allowance001": 10000,
      "allowance002": 5000
    },
    "totalEarnings": 405000,
    "socialInsurance": 50000,
    "employeePension": 40000,
    "employmentInsurance": 2000,
    "municipalTax": 15000,
    "incomeTax": 10000,
    "deductions": {
      "deduction001": 3000
    },
    "totalDeductions": 120000,
    "netPay": 285000
  },
  "createdAt": "2024-02-01T10:00:00Z",
  "updatedAt": "2024-02-01T10:00:00Z"
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
      "field": "baseSalary",
      "message": "基本給は必須です"
    }
  ]
}
```

**409 Conflict**

```json
{
  "error": "Conflict",
  "message": "指定された期間の給与明細は既に登録されています"
}
```

---

## 4. 給与明細更新

### エンドポイント

```
PUT /payroll/{payrollId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| payrollId | string | はい | 給与明細ID |

#### リクエストボディ

（給与明細作成と同じ）

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "pr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "companyName": "株式会社A・1インテリア",
  "period": "2024年 1月",
  "detail": {
    "workingDays": 22,
    "holidayWork": 0,
    "paidLeave": 2,
    "paidLeaveRemaining": 18,
    "paidLeaveRemainingDate": "2024-01-31",
    "normalOvertime": 10,
    "lateNightOvertime": 2,
    "baseSalary": 320000,
    "overtimeAllowance": 50000,
    "lateNightAllowance": 10000,
    "mealAllowance": 5000,
    "commutingAllowance": 15000,
    "housingAllowance": 20000,
    "allowances": {
      "allowance001": 10000,
      "allowance002": 5000
    },
    "totalEarnings": 425000,
    "socialInsurance": 50000,
    "employeePension": 40000,
    "employmentInsurance": 2000,
    "municipalTax": 15000,
    "incomeTax": 10000,
    "deductions": {
      "deduction001": 3000
    },
    "totalDeductions": 120000,
    "netPay": 305000
  },
  "createdAt": "2024-02-01T10:00:00Z",
  "updatedAt": "2024-02-01T11:00:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された給与明細が見つかりません"
}
```

---

## 5. 給与明細削除

### エンドポイント

```
DELETE /payroll/{payrollId}
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| payrollId | string | はい | 給与明細ID |

#### リクエスト例

```bash
DELETE /payroll/pr001
```

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された給与明細が見つかりません"
}
```

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "管理者のみが給与明細を削除できます"
}
```

---

## 6. 給与明細メモ更新

### エンドポイント

```
PATCH /payroll/{payrollId}/memo
```

### リクエスト

#### パスパラメータ

| パラメータ名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| payrollId | string | はい | 給与明細ID |

#### リクエストボディ

```json
{
  "memo": "備考情報をここに入力"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| memo | string \| null | いいえ | メモ（nullの場合はメモを削除） |

#### リクエスト例

```bash
PATCH /payroll/pr001/memo
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "memo": "備考情報をここに入力"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "id": "pr001",
  "employeeId": "emp001",
  "employeeName": "山田 太郎",
  "companyName": "株式会社A・1インテリア",
  "period": "2024年 1月",
  "memo": "備考情報をここに入力",
  "detail": {
    "workingDays": 22,
    "holidayWork": 0,
    "paidLeave": 2,
    "paidLeaveRemaining": 18,
    "paidLeaveRemainingDate": "2024-01-31",
    "normalOvertime": 10,
    "lateNightOvertime": 2,
    "baseSalary": 300000,
    "overtimeAllowance": 50000,
    "lateNightAllowance": 10000,
    "mealAllowance": 5000,
    "commutingAllowance": 15000,
    "housingAllowance": 20000,
    "allowances": {
      "allowance001": 10000,
      "allowance002": 5000
    },
    "totalEarnings": 405000,
    "socialInsurance": 50000,
    "employeePension": 40000,
    "employmentInsurance": 2000,
    "municipalTax": 15000,
    "incomeTax": 10000,
    "deductions": {
      "deduction001": 3000
    },
    "totalDeductions": 120000,
    "netPay": 285000
  },
  "createdAt": "2024-02-01T10:00:00Z",
  "updatedAt": "2024-02-01T10:30:00Z"
}
```

#### エラーレスポンス

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された給与明細が見つかりません"
}
```

**403 Forbidden**

```json
{
  "error": "Forbidden",
  "message": "給与明細のメモを更新する権限がありません"
}
```

**注意事項**:
- 管理者のみが給与明細のメモを更新可能
- 従業員は自分の給与明細のメモのみ更新可能（将来的に権限を拡張する場合を考慮）
- `memo`フィールドに`null`を指定すると、メモを削除します

---

## 7. 残業代計算

### エンドポイント

```
POST /payroll/calculate-overtime
```

### リクエスト

#### ヘッダー

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

#### リクエストボディ

```json
{
  "employeeId": "emp001",
  "startDateTime": "2025-12-15T09:00:00Z",
  "endDateTime": "2025-12-15T20:30:00Z",
  "breakMinutes": 90,
  "workDate": "2025-12-15"
}
```

#### リクエストボディのスキーマ

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| employeeId | string | はい | 従業員ID |
| startDateTime | string | はい | 出勤日時（ISO 8601形式） |
| endDateTime | string | はい | 退勤日時（ISO 8601形式） |
| breakMinutes | number | はい | 休憩時間（分単位） |
| workDate | string | はい | 勤務日（YYYY-MM-DD形式、開始日の日付） |

#### リクエスト例

```bash
POST /payroll/calculate-overtime
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "employeeId": "emp001",
  "startDateTime": "2025-12-15T09:00:00Z",
  "endDateTime": "2025-12-15T20:30:00Z",
  "breakMinutes": 90,
  "workDate": "2025-12-15"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "overtimeByTimeSlot": {
    "05:00-08:44": 0,
    "18:16-21:59": 134,
    "22:00-04:59": 0
  },
  "overtimeAllowanceByTimeSlot": {
    "05:00-08:44": 0,
    "18:16-21:59": 43542,
    "22:00-04:59": 0
  },
  "overtimeRate": 15610,
  "totalOvertimeAllowance": 43542,
  "totalWorkMinutes": 600,
  "prescribedWorkMinutes": 450,
  "overtimeMinutes": 150
}
```

#### レスポンスボディのスキーマ

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| overtimeByTimeSlot | object | 時間帯別の残業時間（分単位） |
| overtimeByTimeSlot["05:00-08:44"] | number | 05:00-08:44時間帯の残業時間（分） |
| overtimeByTimeSlot["18:16-21:59"] | number | 18:16-21:59時間帯の残業時間（分） |
| overtimeByTimeSlot["22:00-04:59"] | number | 22:00-04:59時間帯の残業時間（分） |
| overtimeAllowanceByTimeSlot | object | 時間帯別の残業代（円単位、切り上げ済み） |
| overtimeAllowanceByTimeSlot["05:00-08:44"] | number | 05:00-08:44時間帯の残業代（円） |
| overtimeAllowanceByTimeSlot["18:16-21:59"] | number | 18:16-21:59時間帯の残業代（円） |
| overtimeAllowanceByTimeSlot["22:00-04:59"] | number | 22:00-04:59時間帯の残業代（円） |
| overtimeRate | number | 残業単価（円/時間、正社員の場合のみ） |
| totalOvertimeAllowance | number | 合計残業代（円単位、切り上げ済み） |
| totalWorkMinutes | number | 実労働時間（分単位、休憩時間除く） |
| prescribedWorkMinutes | number | 所定労働時間（分単位、正社員: 450分、パート: 個人ごとに異なる） |
| overtimeMinutes | number | 残業時間（分単位、正社員の場合のみ、パートは0） |

#### エラーレスポンス

**400 Bad Request**

```json
{
  "error": "BadRequest",
  "message": "必須項目が不足しています",
  "details": [
    {
      "field": "employeeId",
      "message": "従業員IDは必須です"
    }
  ]
}
```

**404 Not Found**

```json
{
  "error": "NotFound",
  "message": "指定された従業員が見つかりません"
}
```

**注意事項**:
- 残業代の計算は全てAPI側で実施します（クライアント側の時刻の誤差を防ぐため）
- 詳細な計算ルールは[OVERTIME_CALCULATION_SPEC.md](./OVERTIME_CALCULATION_SPEC.md)を参照してください
- パートの場合は、残業判定を行わず、実労働時間 × 基本給（時給）で計算します
- `overtimeRate`は正社員の場合のみ返却されます（パートの場合は`null`）

---

## データモデル

### PayrollRecord

```typescript
interface PayrollRecord {
  id: string;                    // 給与明細ID（UUID形式推奨）
  employeeId: string;            // 従業員ID
  employeeName: string;          // 従業員名
  companyName: string;           // 会社名
  period: string;                // 給与期間（例: "2024年 1月"）
  memo?: string | null;          // メモ（オプション）
  detail: PayrollDetail;         // 給与明細の詳細情報
  createdAt: string;             // 作成日時（ISO 8601）
  updatedAt: string;             // 更新日時（ISO 8601）
  updatedBy?: string;            // 更新者（オプション）
}

interface OvertimeCalculation {
  // 時間帯別の残業時間（分単位）
  overtimeByTimeSlot: {
    "05:00-08:44": number;      // 平日・土曜: 1.25倍、日曜: 1.50倍
    "18:16-21:59": number;      // 1.25倍（全曜日）
    "22:00-04:59": number;      // 1.50倍（全曜日）
  };
  
  // 時間帯別の残業代（円単位、切り上げ済み）
  overtimeAllowanceByTimeSlot: {
    "05:00-08:44": number;
    "18:16-21:59": number;
    "22:00-04:59": number;
  };
  
  // 残業単価（正社員の場合のみ、円/時間）
  overtimeRate?: number;
  
  // 合計残業代（円単位、切り上げ済み）
  totalOvertimeAllowance: number;
}

interface PayrollDetail {
  workingDays: number;           // 出勤日数
  holidayWork: number;           // 休日出勤日数
  paidLeave: number;             // 有給休暇日数
  paidLeaveRemaining: number;    // 有給残日数
  paidLeaveRemainingDate: string; // 有給残の時点（YYYY-MM-DD）
  normalOvertime: number;        // 普通残業時間（時間単位、後方互換性のため残す）
  lateNightOvertime: number;     // 深夜残業時間（時間単位、後方互換性のため残す）
  baseSalary: number;            // 基本給（正社員: 月給、パート: 時給）
  overtimeAllowance: number;     // 時間外手当（合計、円単位）
  lateNightAllowance: number;    // 深夜手当（後方互換性のため残す）
  mealAllowance: number;         // 食事手当
  commutingAllowance: number;    // 交通費
  housingAllowance: number;      // 住宅手当
  allowances: { [key: string]: number };  // 手当IDをキーとした金額のマップ
  overtimeCalculation?: OvertimeCalculation;  // 残業代計算結果（監査用、オプション）
  totalEarnings: number;         // 総支給額
  socialInsurance: number;       // 社会保険料
  employeePension: number;       // 厚生年金保険料
  employmentInsurance: number;   // 雇用保険料
  municipalTax: number;          // 市県民税
  incomeTax: number;             // 所得税
  deductions: { [key: string]: number };  // 控除IDをキーとした金額のマップ
  totalDeductions: number;       // 控除合計
  netPay: number;                // 差引支給額
}
```

---

## Lambda関数実装時の注意事項

1. **認証**: Cognito User Poolからのトークンを検証
2. **権限チェック**: 
   - 管理者のみが給与明細の作成・更新・削除を実行可能
   - 従業員は自分の給与明細のみ参照可能
3. **バリデーション**: 
   - 同一期間の給与明細の重複を防止
   - 計算値（総支給額、控除合計、差引支給額）の検証
   - 金額が負の値でないことを確認
4. **計算**: 
   - `totalEarnings` = 基本給 + 各種手当の合計
   - `totalDeductions` = 各種控除の合計
   - `netPay` = `totalEarnings` - `totalDeductions`
   - 計算値の自動計算と検証を実装
   - **残業代計算**: 残業代の計算は[OVERTIME_CALCULATION_SPEC.md](./OVERTIME_CALCULATION_SPEC.md)に従って実施
     - 正社員: 所定労働時間（7.5時間/日）を超えた時間のみ残業として計算
     - パート: 残業判定なし（実労働時間 × 基本給（時給））
     - 残業代計算結果は`overtimeCalculation`フィールドに保存（監査用）
5. **トランザクション**: RDSでの更新処理は適切にトランザクション管理
6. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージを返却


