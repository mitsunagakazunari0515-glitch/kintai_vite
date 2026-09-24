import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { InteractionStyles } from "@a1int/ui";

// Amplifyの設定はAuthContext内で非同期に行われます
// これにより、amplify_outputs.jsonが存在しない場合でもアプリケーションは起動します
// 開発環境では、npx ampx sandboxを実行してamplify_outputs.jsonを生成してください

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 全ボタン共通のホバー／押下表現（UIルール docs/UI_RULES.md） */}
    <InteractionStyles />
    <App />
  </React.StrictMode>
);
