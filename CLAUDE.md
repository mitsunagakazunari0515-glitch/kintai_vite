# kintai_vite 開発ガイド（Claude Code 用）

勤怠管理システムのフロントエンド。Vite + React + TS、AWS Amplify Hosting で稼働（本番運用中）。
このワークスペースの**デザインの正典**（在庫・パースは勤怠のデザインを踏襲する）。

## いまの状況

- 共通 UI パッケージ `@a1int/ui` への移行を進行中（見た目は不変が原則）。作業ブランチ `feature/migrate-a1int-ui`
- `@a1int/ui` は GitHub Packages 配信（インストールに NODE_AUTH_TOKEN が必要）

## 構成の要点

- `npm run dev` / `build` は先頭で `scripts/copy-amplify-outputs.js` が走る（amplify_outputs の配置）
- コーディング規約は `CODING_RULES.md` を参照

## ルール

- 検証: `npm run lint`（--max-warnings 0）/ `npm test`（Vitest）をグリーンに。型は `npm run build` 内の tsc で確認
- コミットは Conventional Commits・日本語
- **main へ直 push しない**（PR 経由。Amplify がブランチ連動でビルドする）
- BE（kintai_node）の型変更を取り込むときは `docs/api/ENDPOINTS.md` と突き合わせる
- 仕様の正はワークスペース docs（attendance-workspace-docs の `docs/frontend/`）

## クラウドセッション（携帯から）での注意

- ローカル API・プレビュー・amplify_outputs は使えない。**コンポーネント実装・リファクタ＋ Vitest** で完結できる範囲のみ扱う。見た目確認が要る変更はブランチ push → ローカルで確認
