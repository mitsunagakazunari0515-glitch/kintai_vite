# FE側の時間計算に関する懸念点

TIME_CALCULATION_GUIDE.mdに基づいて、FE側のコードを確認した結果、以下の懸念点が確認されました。

## 1. 日付をまたぐ勤務の判定が欠けている

### 問題点

現在の`calculateWorkTime`関数（`src/pages/employee/Attendance.tsx`の122-155行目）では、日付をまたぐ勤務（退勤時刻が出勤時刻より前の場合）を考慮していません。

```typescript
// 現在の実装（問題あり）
const [inHour, inMinute] = log.clockIn.split(':').map(Number);
const [outHour, outMinute] = log.clockOut.split(':').map(Number);
const inMinutes = inHour * 60 + inMinute;
const outMinutes = outHour * 60 + outMinute;

// 実働時間を計算（退勤時刻 - 出勤時刻 - 休憩時間）
const workMinutes = outMinutes - inMinutes - breakMinutes;
```

### 影響

- **22時出勤→翌朝6時退勤の場合**: `06:00` - `22:00` = -16時間（負の値）となり、`'-'`が返される
- **23時出勤→翌朝4時退勤の場合**: `04:00` - `23:00` = -19時間（負の値）となり、`'-'`が返される

### 修正が必要な箇所

1. `calculateWorkTime`関数（122-155行目）
2. `calculateStatistics`関数内の計算（688-717行目）

### 修正方法

TIME_CALCULATION_GUIDE.mdに基づき、退勤時刻が出勤時刻より前の場合は、退勤時刻に24時間（1440分）を加算して計算します。

```typescript
// 修正後の実装
const inMinutes = inHour * 60 + inMinute;
let outMinutes = outHour * 60 + outMinute;

// 日付をまたぐ場合の判定（退勤時刻が出勤時刻より前の場合）
if (outMinutes < inMinutes) {
  // 退勤時刻に24時間（1440分）を加算
  outMinutes += 24 * 60;
}

const workMinutes = outMinutes - inMinutes - breakMinutes;
```

## 2. 退勤時刻の表示（5時未満の場合は「翌朝」を付与）

### 問題点

現在のコードでは、退勤時刻が5時未満（0時〜4時59分59秒）の場合でも、「翌朝」を付与していません。

- `extractTime`関数（68-78行目）: ISO 8601形式から時刻を抽出するのみ
- `formatTime`関数（`src/utils/formatters.ts`）: 通常の時刻表示のみ（「翌朝」の表示なし）

### 影響

- **22時出勤→翌朝4時退勤の場合**: `04:00`と表示されるが、`翌朝04:00`と表示するべき
- ユーザーが日付をまたぐ勤務であることを視覚的に認識できない

### 修正が必要な箇所

1. 退勤時刻の表示処理（1288行目、1356行目、2077行目など）
2. `formatTime`関数または専用の`formatClockOutTime`関数の追加

### 修正方法

TIME_CALCULATION_GUIDE.mdに基づき、退勤時刻が5時未満の場合は「翌朝」を付与します。

```typescript
/**
 * 退勤時刻を表示用に変換します（5時未満の場合は「翌朝」を付与）
 */
function formatClockOutTime(workDate: string, clockOutTime: string | null): string {
  if (!clockOutTime) {
    return '未記録';
  }
  
  const [hours, minutes] = clockOutTime.split(':').map(Number);
  
  // 5時未満（0時〜4時59分59秒）の場合は「翌朝」を付与
  if (hours < 5) {
    return `翌朝${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  // 5時以降の場合は通常の時刻表記
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
```

ただし、APIレスポンスのISO 8601形式から日付情報も取得する必要があります。

## 3. APIレスポンスの時刻処理

### 問題点

`extractTime`関数は、ISO 8601形式（`2024-01-16T04:00:00Z`）から時刻を抽出していますが、以下の問題があります：

1. **日付情報の欠落**: `workDate`と`clockOut`の日付を比較して、日付をまたいでいるかを判定する必要がある
2. **5時未満の判定**: 時刻のみでは5時未満かどうかを判定できるが、日付情報がないと「翌朝」表示ができない

### 影響

- APIレスポンスが`workDate: "2024-01-15"`、`clockOut: "2024-01-16T04:00:00Z"`の場合、日付をまたいでいることが分かる
- しかし、現在の`extractTime`関数は時刻のみを抽出するため、日付情報が失われる

### 修正が必要な箇所

1. `extractTime`関数（68-78行目）: 日付情報も保持する必要がある可能性
2. `convertApiLogToUiLog`関数: 日付情報を考慮した処理

### 修正方法

APIレスポンスのISO 8601形式から、日付と時刻の両方を取得し、`workDate`と比較して日付をまたいでいるかを判定します。

```typescript
// APIレスポンスの例
// workDate: "2024-01-15"
// clockOut: "2024-01-16T04:00:00Z"

const clockOutDate = new Date(apiLog.clockOut);
const clockOutDateStr = clockOutDate.toISOString().split('T')[0];
const isNextDay = clockOutDateStr !== apiLog.workDate;

// 5時未満の場合は「翌朝」を付与
const hours = clockOutDate.getHours();
const minutes = clockOutDate.getMinutes();
const clockOutTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
const displayClockOut = (hours < 5) ? `翌朝${clockOutTime}` : clockOutTime;
```

## 4. 休憩時間の計算

### 問題点

現在の休憩時間の計算（133-144行目、695-706行目）では、日付をまたぐ休憩を考慮していません。

### 影響

- 22時出勤→翌朝6時退勤で、23時〜翌朝1時の休憩の場合、正常に計算される可能性が高い
- ただし、休憩時間が日付をまたぐ場合の処理が明確でない

### 確認が必要な箇所

休憩時間の計算ロジックが、TIME_CALCULATION_GUIDE.mdの要件を満たしているかを確認する必要があります。

## 5. 統計計算（月間集計）

### 問題点

`calculateStatistics`関数内の計算（688-717行目）でも、日付をまたぐ勤務を考慮していません。

### 影響

- 月間の実労働時間、実残業時間の計算が不正確になる可能性がある

### 修正が必要な箇所

`calculateStatistics`関数内の計算ロジック

## まとめ

### 優先度: 高

1. **日付をまたぐ勤務の判定**: `calculateWorkTime`関数と`calculateStatistics`関数内の計算を修正
2. **退勤時刻の表示（5時未満の場合は「翌朝」を付与）**: `formatClockOutTime`関数を追加し、退勤時刻の表示を修正

### 優先度: 中

3. **APIレスポンスの時刻処理**: 日付情報を考慮した処理を追加

### 優先度: 低

4. **休憩時間の計算**: 必要に応じて確認・修正
5. **統計計算（月間集計）**: 日付をまたぐ勤務の処理を追加

## 推奨される修正順序

1. `calculateWorkTime`関数の修正（日付をまたぐ勤務の判定を追加）
2. `formatClockOutTime`関数の追加（退勤時刻の表示を修正）
3. `calculateStatistics`関数内の計算の修正（日付をまたぐ勤務の判定を追加）
4. APIレスポンスの時刻処理の改善（必要に応じて）

