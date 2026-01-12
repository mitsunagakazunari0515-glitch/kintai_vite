# 日本語エンコード・デコードルール

APIと日本語でやりとりする際の統一されたエンコード・デコードルールを定義します。

## 概要

HTTPヘッダーにはISO-8859-1文字のみが許可されるため、日本語などの非ASCII文字を含む場合はBase64エンコードを使用します。

## 対象範囲

このルールは、以下の場合に適用されます：

- **HTTPヘッダー**に日本語が含まれる場合（例: `X-Requested-By`ヘッダー）
- **クエリパラメータ**に日本語が含まれる場合（将来的に追加予定）
- **パスパラメータ**に日本語が含まれる場合（将来的に追加予定）

**注意**: リクエストボディ・レスポンスボディのJSONには、UTF-8エンコードが使用されるため、このルールは適用されません。

## エンコード方式

### 基本ルール

**常にBase64エンコード**: 英語のみでも日本語でも、常にBase64エンコードします。
- これにより、フラグが不要になり、実装がシンプルになります
- 英語のみの文字列をBase64エンコードしても問題なく、デコード時に正しく復元されます

### エンコード手順

1. `TextEncoder`（フロントエンド）または`Buffer.from()`（バックエンド）を使用してUTF-8バイト配列に変換
2. 各バイトをISO-8859-1文字として解釈（`String.fromCharCode()`）
3. `btoa()`（フロントエンド）または`Buffer.toString('base64')`（バックエンド）でBase64エンコード

### エンコードフラグ

**注意**: フラグは不要です。常にBase64エンコードします（英語のみでも問題なく動作）。
デコード時は常にBase64デコードを試みます（失敗した場合は元の値を返す）。

## デコード方式

### 基本ルール

**常にBase64デコードを試みる**: フラグ不要。常にBase64デコードを試みます。
- デコードに成功した場合は、デコードされた値を使用
- デコードに失敗した場合は、元の値をそのまま使用（後方互換性のため）

### デコード手順

1. `atob()`（フロントエンド）または`Buffer.from(encodedStr, 'base64')`（バックエンド）でBase64デコード
2. 各文字をISO-8859-1バイトとして解釈（`charCodeAt()`）
3. `TextDecoder`（フロントエンド）または`Buffer.toString('utf8')`（バックエンド）でUTF-8デコード

## 実装詳細

### フロントエンド（TypeScript/React）

#### エンコード関数

```typescript
import { encodeJapaneseString } from '../utils/japaneseEncoder';

// 常にBase64エンコード（英語のみでも問題なく動作）
const encodedValue = encodeJapaneseString('従業員名');
requestHeaders['X-Requested-By'] = encodedValue;
```

#### デコード関数

```typescript
import { decodeFromHttpHeader } from '../utils/japaneseEncoder';

const encodedValue = headers['X-Requested-By'];
// フラグ不要: 常にBase64デコードを試みる
const decodedValue = decodeFromHttpHeader(encodedValue);
```

### バックエンド（Lambda/Node.js）

#### エンコード関数

```typescript
import { encodeJapaneseString } from './japaneseEncoder';

// 常にBase64エンコード（英語のみでも問題なく動作）
const encodedValue = encodeJapaneseString('従業員名');
responseHeaders['X-Requested-By'] = encodedValue;
```

#### デコード関数

```typescript
import { decodeFromHttpHeader } from './japaneseEncoder';

const encodedValue = event.headers['X-Requested-By'] || event.headers['x-requested-by'];
// フラグ不要: 常にBase64デコードを試みる
const decodedValue = decodeFromHttpHeader(encodedValue);
```

## 使用例

### フロントエンドでの送信

```typescript
// src/config/apiConfig.ts の apiRequest 関数内
import { encodeJapaneseString } from '../utils/japaneseEncoder';

// X-Requested-Byヘッダー（常にBase64エンコード）
if (!requestHeaders['X-Requested-By']) {
  const userInfo = getUserInfo();
  if (userInfo.requestedBy) {
    requestHeaders['X-Requested-By'] = encodeJapaneseString(userInfo.requestedBy);
  }
}
```
```

### バックエンドでの受信

```typescript
// amplify/functions/api/handler.ts
import { decodeFromHttpHeader } from './japaneseEncoder';

// X-Requested-Byヘッダーを取得してデコード（フラグ不要）
const requestedByRaw = headers['X-Requested-By'] || headers['x-requested-by'];
if (requestedByRaw) {
  const requestedBy = decodeFromHttpHeader(requestedByRaw);
  // requestedBy: デコードされた日本語文字列（例: "山田太郎"）
}
```
```

## エンコード・デコードのテスト

### テストケース

| 入力文字列 | ISO-8859-1のみ | エンコード後 | デコード後 |
|-----------|--------------|------------|----------|
| `"Employee"` | Yes | `"Employee"`（エンコードなし） | `"Employee"` |
| `"従業員"` | No | Base64エンコード文字列 | `"従業員"` |
| `"山田 太郎"` | No | Base64エンコード文字列 | `"山田 太郎"` |
| `"Employee123"` | Yes | `"Employee123"`（エンコードなし） | `"Employee123"` |
| `"従業員123"` | No | Base64エンコード文字列 | `"従業員123"` |
| `""`（空文字） | Yes | `""`（エンコードなし） | `""` |

### テストコード例

```typescript
// フロントエンド
import { encodeForHttpHeader, decodeFromHttpHeader } from '../utils/japaneseEncoder';

const testCases = [
  'Employee',
  '従業員',
  '山田 太郎',
  'Employee123',
  '従業員123',
  ''
];

testCases.forEach(testCase => {
  const { encodedValue, isEncoded } = encodeForHttpHeader(testCase);
  const decoded = decodeFromHttpHeader(encodedValue, isEncoded);
  console.assert(decoded === testCase, `Failed: ${testCase} -> ${decoded}`);
});
```

```typescript
// バックエンド
import { encodeForHttpHeader, decodeFromHttpHeader } from './japaneseEncoder';

const testCases = [
  'Employee',
  '従業員',
  '山田 太郎',
  'Employee123',
  '従業員123',
  ''
];

testCases.forEach(testCase => {
  const { encodedValue, isEncoded } = encodeForHttpHeader(testCase);
  const decoded = decodeFromHttpHeader(encodedValue, isEncoded);
  console.assert(decoded === testCase, `Failed: ${testCase} -> ${decoded}`);
});
```

## 注意事項

1. **リクエストボディ・レスポンスボディ**: JSONにはUTF-8エンコードが使用されるため、このルールは適用されません。

2. **フラグ不要**: `X-Requested-By-Encoded`フラグは不要です。常にBase64エンコードし、デコード時は常にBase64デコードを試みます。

3. **常にエンコード**: 英語のみの文字列でもBase64エンコードします。これにより、実装がシンプルになり、フラグ管理が不要になります。

4. **デコード失敗時の処理**: `decodeFromHttpHeader()`でデコードに失敗した場合は、元の値をそのまま返します（後方互換性のため）。

5. **大文字・小文字**: HTTPヘッダー名は大文字・小文字を区別しないため、`X-Requested-By`と`x-requested-by`は同じです。

6. **パフォーマンス**: エンコード・デコード処理は軽量ですが、頻繁に呼び出される場合は、結果をキャッシュすることを検討してください。

## 関連ファイル

- **フロントエンド**: `src/utils/japaneseEncoder.ts`
- **バックエンド**: `amplify/functions/api/japaneseEncoder.ts`
- **API設定**: `src/config/apiConfig.ts`
- **Lambdaハンドラー**: `amplify/functions/api/handler.ts`

## 更新履歴

- 2026-01-10: 初版作成

