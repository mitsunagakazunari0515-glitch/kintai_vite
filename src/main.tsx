import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SystemThemeProvider } from "@a1int/ui";
import { KINTAI_THEME } from "./theme";

// Amplifyの設定はAuthContext内で非同期に行われます
// これにより、amplify_outputs.jsonが存在しない場合でもアプリケーションは起動します
// 開発環境では、npx ampx sandboxを実行してamplify_outputs.jsonを生成してください

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* システム識別テーマ。全ボタン共通のホバー／押下表現（InteractionStyles）も Provider が描画する（UIルール docs/UI_RULES.md） */}
    <SystemThemeProvider theme={KINTAI_THEME}>
      <App />
    </SystemThemeProvider>
  </React.StrictMode>
);
