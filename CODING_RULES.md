# 💻 勤怠システム開発プロジェクト：コードコメント・コーディングルール (Vite + TypeScript)

このドキュメントは、Vite + TypeScript環境における**コードコメントの標準**を定めます。すべての開発者（およびAIアシスタント）は、このガイドラインに従ってコメントを記述してください。

## 1. 基本原則

1.  **目的明確化:** コメントは、コードの**意図 (なぜ)** や **複雑なロジック (何を)** を説明するために使用し、自明なコードの説明は避けます。
2.  **最新性:** コメントは常にコードの動作と一致させます。不正確なコメントはコメントがないよりも有害です。
3.  **自動生成ドキュメント (TSDoc 必須):** 公開されるAPI（関数、クラス、型）には、ドキュメント生成を可能にする **TSDoc 形式**のコメントを必須とします。

---

## 2. ドキュメントコメント (TSDoc 形式)

**すべてのエクスポートされる要素 (関数、クラス、インターフェース、型エイリアス) には、`/** ... */` 形式の TSDoc コメントを必須とします。**

| 項目 | 記述ルール | TSDocタグ | 必須/推奨 |
| :--- | :--- | :--- | :--- |
| **概要** | 要素の**役割**を簡潔な一文で記述。 | なし | **必須** |
| **パラメータ** | 各引数の**目的**と**期待される値**。 | `@param {Type} name` | **必須** (引数がある場合) |
| **返り値** | 返される値の**意味**。 | `@returns {Type}` | **必須** (返り値がある場合) |
| **非推奨** | 使用を停止する場合。 | `@deprecated` | 必要に応じて |
| **例** | 使用方法を示すコードスニペット。 | `@example` | 推奨 |

### 📝 TSDoc 記述例

```typescript
/**
 * ユーザーIDに基づき、勤怠管理APIからユーザーの基本情報を非同期で取得します。
 *
 * @param {string} userId - 取得対象のユーザーを一意に特定するID。UUID形式を想定。
 * @param {boolean} includeHistory - 過去の打刻履歴を含めるかどうか。
 * @returns {Promise<User>} 取得されたユーザーオブジェクト（履歴を含む場合もある）。
 * @throws {ApiError} API通信エラーまたはユーザー非存在の場合。
 * @example
 * // 履歴なしでユーザー情報を取得
 * const user = await fetchUser('U001', false);
 */
export async function fetchUser(userId: string, includeHistory: boolean): Promise<User> {
    // ... implementation
}
```

---

## 3. テストコード（Vitest + Testing Library）

2026-07-05よりVitestによる単体テスト環境を導入しています。仕様駆動開発の詳細フロー
（仕様書更新→製造→単体テスト→結合テスト）は、統合ワークスペースリポジトリの
`docs/DEVELOPMENT_WORKFLOW.md` を参照してください。ここではファイル配置・記述スタイルのルールのみ定めます。

1. **配置**: テスト対象ファイルと同じディレクトリに `Foo.test.ts` / `Foo.test.tsx` として置く
   （`__tests__/` ディレクトリに隔離しない）。
2. **import**: `vite.config.ts` の `test.globals` は `false` にしているため、
   `describe`/`it`/`expect`/`vi` 等は毎回 `import { ... } from 'vitest'` で明示的にimportする。
3. **コンポーネントテスト**: `@testing-library/react` の `render`/`screen` と
   `@testing-library/user-event` を使い、内部実装ではなく画面上の見た目・振る舞いを検証する。
   `render()` は各テスト後に `src/test/setup.ts` の `afterEach(cleanup)` で自動アンマウントされる。
4. **何をテストするか**: `attendance-workspace/docs/` の設計書に明記された振る舞い
   （エラーメッセージ変換、ソート順、バリデーション等）を優先する。CSSの見た目はテスト対象外でよい。
5. **実行**: `npm run test`（1回実行）/ `npm run test:watch` / `npm run test:coverage`