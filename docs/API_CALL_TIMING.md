# API通信タイミング一覧

## 認証・認可API

### `GET /api/v1/auth/authorize`
- **タイミング**: 
  1. `AuthContext.checkAuthStatus()` 内で、トークンが有効な場合のみ
  2. `Login.login()` 実行後、`checkAuthStatus()` が呼ばれた時
  3. `Login.signInWithGoogle()` 実行後、`signedIn` Hubイベントで`checkAuthStatus()` が呼ばれた時
  4. アプリ起動時、`configureAmplify()` 完了後、`checkAuthStatus()` が呼ばれた時（**問題: 初回起動時にも実行される**）

### `POST /api/v1/auth/refresh-authorization`
- **タイミング**: 
  1. `tokenRefresh` Hubイベント発生時

## 従業員API

### `GET /api/v1/employees`
- **タイミング**: 
  1. `EmployeeList.tsx` 画面マウント時（`useEffect`）

### `GET /api/v1/employees/:employeeId`
- **タイミング**: 
  1. `EmployeeRegistration.tsx` 編集モード時（`isEditing && id` の場合のみ、`useEffect`）

### `POST /api/v1/employees/register`
- **タイミング**: 
  1. `EmployeeRegistration.tsx` 新規登録ボタン押下時

### `PUT /api/v1/employees/:employeeId/update`
- **タイミング**: 
  1. `EmployeeRegistration.tsx` 更新ボタン押下時

## 勤怠API

### `GET /api/v1/attendance`
- **タイミング**: 
  1. `Attendance.tsx` 画面マウント時（`useEffect`）
  2. `Attendance.tsx` で `selectedYear` または `selectedMonth` が変更された時（`useEffect` の依存配列）

### `POST /api/v1/attendance/clock-in`
- **タイミング**: 
  1. `Attendance.tsx` 出勤ボタン押下時

### `POST /api/v1/attendance/clock-out`
- **タイミング**: 
  1. `Attendance.tsx` 退勤ボタン押下時

### `POST /api/v1/attendance/break/start`
- **タイミング**: 
  1. `Attendance.tsx` 休憩開始ボタン押下時

### `POST /api/v1/attendance/break/end`
- **タイミング**: 
  1. `Attendance.tsx` 休憩終了ボタン押下時

### `PUT /api/v1/attendance/:attendanceId`
- **タイミング**: 
  1. `Attendance.tsx` 打刻修正ボタン押下時

### `PATCH /api/v1/attendance/memo`
- **タイミング**: 
  1. `Attendance.tsx` メモ更新時

## 休暇申請API

### `GET /api/v1/leave-requests`
- **タイミング**: 
  1. `LeaveRequest.tsx` 画面マウント時（`useEffect`）
  2. `LeaveRequest.tsx` で `searchFiscalYear` が変更された時（`useEffect` の依存配列）

### `GET /api/v1/leave-requests/:requestId`
- **タイミング**: 
  1. `LeaveRequest.tsx` で特定の申請を編集する時

### `POST /api/v1/leave-requests`
- **タイミング**: 
  1. `LeaveRequest.tsx` 申請ボタン押下時

### `PUT /api/v1/leave-requests/:requestId`
- **タイミング**: 
  1. `LeaveRequest.tsx` 申請更新ボタン押下時

### `DELETE /api/v1/leave-requests/:requestId`
- **タイミング**: 
  1. `LeaveRequest.tsx` 申請取消ボタン押下時

### `PATCH /api/v1/leave-requests/:requestId/approve`
- **タイミング**: 
  1. 管理者画面で申請承認ボタン押下時

### `PATCH /api/v1/leave-requests/:requestId/reject`
- **タイミング**: 
  1. 管理者画面で申請却下ボタン押下時

## 給与明細API

### `GET /api/v1/payroll`
- **タイミング**: 
  1. `EmployeePayroll.tsx` 画面マウント時（`useEffect`）
  2. `EmployeePayroll.tsx` で検索条件が変更された時

### `GET /api/v1/payroll/:payrollId`
- **タイミング**: 
  1. `EmployeePayroll.tsx` で特定の給与明細を選択した時

### `POST /api/v1/payroll`
- **タイミング**: 
  1. `EmployeePayroll.tsx` 新規登録ボタン押下時

### `PUT /api/v1/payroll/:payrollId`
- **タイミング**: 
  1. `EmployeePayroll.tsx` 更新ボタン押下時

### `PATCH /api/v1/payroll/:payrollId/memo`
- **タイミング**: 
  1. `EmployeePayroll.tsx` メモ更新時

## 手当マスタAPI

### `GET /api/v1/allowances`
- **タイミング**: 
  1. `AllowanceMaster.tsx` 画面マウント時（`useEffect`）

### `GET /api/v1/allowances/:allowanceId`
- **タイミング**: 
  1. `AllowanceMaster.tsx` で特定の手当を編集する時

### `POST /api/v1/allowances`
- **タイミング**: 
  1. `AllowanceMaster.tsx` 新規登録ボタン押下時

### `PUT /api/v1/allowances/:allowanceId`
- **タイミング**: 
  1. `AllowanceMaster.tsx` 更新ボタン押下時

### `DELETE /api/v1/allowances/:allowanceId`
- **タイミング**: 
  1. `AllowanceMaster.tsx` 削除ボタン押下時

## 控除マスタAPI

### `GET /api/v1/deductions`
- **タイミング**: 
  1. `DeductionMaster.tsx` 画面マウント時（`useEffect`）

### `GET /api/v1/deductions/:deductionId`
- **タイミング**: 
  1. `DeductionMaster.tsx` で特定の控除を編集する時

### `POST /api/v1/deductions`
- **タイミング**: 
  1. `DeductionMaster.tsx` 新規登録ボタン押下時

### `PUT /api/v1/deductions/:deductionId`
- **タイミング**: 
  1. `DeductionMaster.tsx` 更新ボタン押下時

### `DELETE /api/v1/deductions/:deductionId`
- **タイミング**: 
  1. `DeductionMaster.tsx` 削除ボタン押下時

## 問題点

### `/login`画面での不要なAPI通信
- **現在**: アプリ起動時、`configureAmplify()` 完了後、`checkAuthStatus()` が自動的に呼ばれ、トークンが存在する場合に `GET /api/v1/auth/authorize` が実行される
- **期待**: ログインボタン押下時またはGoogleログインボタン押下時のみAPI通信を実行

### 修正方針
1. `checkAuthStatus()` を初回起動時には呼ばないようにする
2. ログインボタン押下時またはGoogleログインボタン押下時のみ `checkAuthStatus()` を呼ぶようにする
3. または、`checkAuthStatus()` 内で、ログイン画面にいる場合はAPI通信をスキップする

