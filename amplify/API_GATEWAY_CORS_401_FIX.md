# API Gateway REST API 401エラーレスポンスにCORSヘッダーを追加する設定ガイド

既存のAPI Gateway `a1kintaiAPI`（REST API、ID: `tv731cev0j`）で、401 UnauthorizedエラーレスポンスにCORSヘッダーが含まれていないため、ブラウザでCORSエラーが発生している問題を解決する手順です。

## 問題の概要

CloudWatch Logsから、GETリクエスト（`/api/v1/auth/authorize`）が401 Unauthorizedエラーになっていることが確認されました：

```json
{
  "requestId": "b42d64c4-60af-45a6-af8e-feccb4e3b60f",
  "httpMethod": "GET",
  "resourcePath": "/{proxy+}",
  "status": "401",
  "error": {
    "message": "Unauthorized",
    "messageString": ""Unauthorized""
  }
}
```

ブラウザコンソールでは、以下のCORSエラーが表示されています：

```
Access to fetch at 'https://tv731cev0j.execute-api.ap-northeast-1.amazonaws.com/dev/api/v1/auth/authorize' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**原因**: 
- Lambda関数の`errorResponse`関数はCORSヘッダーを返すように実装されていますが、API Gateway REST APIでプロキシ統合を使用している場合、統合レスポンスのマッピングでヘッダーを返す必要がある場合があります
- または、Authorizerが401エラーを返している場合、AuthorizerのレスポンスにCORSヘッダーが含まれていない可能性があります

**解決方法**: API Gatewayのゲートウェイレスポンスで401エラーに対してCORSヘッダーを追加します。

## 解決手順

### 方法1: API GatewayコンソールでゲートウェイレスポンスにCORSヘッダーを追加（推奨）

1. **API Gateway**コンソールにアクセス
2. **`a1kintaiAPI`**を選択
3. 左側のメニューから**「ゲートウェイのレスポンス」**を選択
4. **「DEFAULT_4XX」**または**「UNAUTHORIZED」**を選択（401エラー用）
5. **「レスポンスヘッダー」**タブをクリック
6. 以下のヘッダーを追加（**重要**: すべての値を**シングルクォート（`'`）で囲む必要があります**）：
   - **ヘッダー名**: `Access-Control-Allow-Origin`
   - **値**: `'http://localhost:5173'` または `'*'`（開発環境の場合）
     - **注意**: シングルクォートを含めて入力してください（例: `'http://localhost:5173'`）
   
7. 同様に、以下のヘッダーも追加（すべてシングルクォートで囲む）：
   - **ヘッダー名**: `Access-Control-Allow-Methods`
   - **値**: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`（シングルクォートで囲む）
     - **注意**: `GET,POST,PUT,PATCH,DELETE,OPTIONS`ではなく、`'GET,POST,PUT,PATCH,DELETE,OPTIONS'`とシングルクォートで囲んでください
   
   - **ヘッダー名**: `Access-Control-Allow-Headers`
   - **値**: `'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'`（シングルクォートで囲む）
   
   - **ヘッダー名**: `Access-Control-Allow-Credentials`
   - **値**: `'true'`（シングルクォートで囲む）
     - **注意**: `true`ではなく、`'true'`とシングルクォートで囲んでください

**重要**: API Gateway REST APIのゲートウェイレスポンスでは、レスポンスヘッダーの値は**文字列リテラル**として扱われるため、すべての値を**シングルクォート（`'`）で囲む必要があります**。シングルクォートがない場合、「Invalid mapping expression specified」エラーが発生します。

8. **「DEFAULT_4XX」**を選択した場合、すべての4xxエラー（400, 401, 403, 404など）にCORSヘッダーが適用されます

9. **保存**をクリック

10. **APIをデプロイ**して変更を反映：
    - 画面上部の**API アクション**ドロップダウンから**API をデプロイ**を選択
    - **デプロイステージ**で`dev`を選択
    - **デプロイ**をクリック

### 方法2: 統合レスポンスのマッピングでCORSヘッダーを返す

`ANY`メソッドの統合レスポンスで、401エラーに対してCORSヘッダーを返すように設定：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**ANY**メソッドを選択
2. **統合レスポンス**タブをクリック
3. **「デフォルト」**または**「401」**ステータスコードを選択/展開
4. **ヘッダーマッピング**を追加：
   - `Access-Control-Allow-Origin`: `'http://localhost:5173'` または `integration.response.header.Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`
   - `Access-Control-Allow-Headers`: `'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'`
   - `Access-Control-Allow-Credentials`: `'true'`
5. **保存**をクリック
6. **APIをデプロイ**して変更を反映

### 方法3: Lambda関数のレスポンスからヘッダーをマッピング（プロキシ統合の場合）

プロキシ統合を使用している場合、Lambda関数のレスポンスヘッダーを統合レスポンスでマッピングする：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**ANY**メソッドを選択
2. **統合レスポンス**タブをクリック
3. **「デフォルト」**または**「401」**ステータスコードを選択
4. **ヘッダーマッピング**で、Lambda関数のレスポンスヘッダーをマッピング：
   - `Access-Control-Allow-Origin`: `integration.response.header.Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`: `integration.response.header.Access-Control-Allow-Methods`
   - `Access-Control-Allow-Headers`: `integration.response.header.Access-Control-Allow-Headers`
   - `Access-Control-Allow-Credentials`: `integration.response.header.Access-Control-Allow-Credentials`
5. **保存**をクリック
6. **APIをデプロイ**して変更を反映

**注意**: プロキシ統合を使用している場合、Lambda関数が返すヘッダーは自動的にクライアントに返されるはずですが、API Gateway REST APIでは明示的なマッピングが必要な場合があります。

## AWS CLIでの設定

### ゲートウェイレスポンスにCORSヘッダーを追加

```bash
# DEFAULT_4XXゲートウェイレスポンスにCORSヘッダーを追加
aws apigateway update-gateway-response \
  --rest-api-id tv731cev0j \
  --response-type DEFAULT_4XX \
  --patch-ops \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Origin,value='http://localhost:5173' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Methods,value='GET,POST,PUT,PATCH,DELETE,OPTIONS' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Headers,value='Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Credentials,value='true' \
  --region ap-northeast-1

# UNAUTHORIZEDゲートウェイレスポンスにCORSヘッダーを追加（401エラー専用）
aws apigateway update-gateway-response \
  --rest-api-id tv731cev0j \
  --response-type UNAUTHORIZED \
  --patch-ops \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Origin,value='http://localhost:5173' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Methods,value='GET,POST,PUT,PATCH,DELETE,OPTIONS' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Headers,value='Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id' \
    op=add,path=/responseParameters/gatewayresponse.header.Access-Control-Allow-Credentials,value='true' \
  --region ap-northeast-1

# 変更を反映するためにAPIをデプロイ
aws apigateway create-deployment \
  --rest-api-id tv731cev0j \
  --stage-name dev \
  --region ap-northeast-1
```

## 確認方法

設定が正しく行われたか確認するには、以下の手順を実行してください：

1. **ブラウザの開発者ツール**を開く
2. **Network**タブを選択
3. APIリクエストを送信（認証トークンなしで送信して401エラーを発生させる）
4. **401エラーレスポンス**の**Response Headers**を確認：
   - `Access-Control-Allow-Origin`ヘッダーが含まれていることを確認
   - 他のCORSヘッダーも含まれていることを確認
5. CORSエラーが解消されていることを確認

## トラブルシューティング

### エラー: "Invalid mapping expression specified: GET,POST,PUT,PATCH,DELETE,OPTIONS"

このエラーは、API Gateway REST APIのゲートウェイレスポンスで、レスポンスヘッダーの値にシングルクォート（`'`）が含まれていない場合に発生します。

**原因**: 
- API Gateway REST APIでは、レスポンスヘッダーの値は**文字列リテラル**として扱われるため、すべての値を**シングルクォート（`'`）で囲む必要があります**
- シングルクォートがない場合、API Gatewayは値をマッピング式として解釈しようとしてエラーになります

**解決方法**:

1. **ヘッダーの値を修正**:
   - 誤った設定: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
   - 正しい設定: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`（シングルクォートで囲む）

2. **すべてのヘッダーの値をシングルクォートで囲む**:
   - `Access-Control-Allow-Origin`: `'http://localhost:5173'` または `'*'`
   - `Access-Control-Allow-Methods`: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`
   - `Access-Control-Allow-Headers`: `'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'`
   - `Access-Control-Allow-Credentials`: `'true'`

3. **既存のヘッダーを削除して再追加**:
   - エラーが発生しているヘッダーを**削除**ボタンで削除
   - **レスポンスヘッダーの追加**ボタンで再追加（シングルクォートを含めて入力）

4. **保存**をクリックしてエラーが解消されたか確認

### 401エラーレスポンスに依然としてCORSヘッダーが含まれていない場合

1. **API Gatewayのデプロイを確認**
   - API Gatewayの変更は、デプロイしないと反映されません
   - ステージ（`dev`）にデプロイされているか確認してください

2. **ゲートウェイレスポンスの設定を確認**
   - **ゲートウェイのレスポンス**で、`DEFAULT_4XX`または`UNAUTHORIZED`が正しく設定されているか確認
   - ヘッダーの値が正しく設定されているか確認（**シングルクォートで囲まれているか確認**）

3. **統合レスポンスのマッピングを確認**
   - プロキシ統合を使用している場合、統合レスポンスのマッピングでヘッダーをマッピングする必要がある場合があります
   - Lambda関数のレスポンスヘッダーが正しく返されているか、CloudWatch Logsで確認してください

4. **Lambda関数のレスポンスを確認**
   - CloudWatch Logsで、Lambda関数が返すレスポンスにCORSヘッダーが含まれているか確認
   - `errorResponse`関数が正しく`getCorsHeaders(event)`を呼び出しているか確認

### Authorizerが401エラーを返している場合

Authorizerが401エラーを返している場合、AuthorizerのレスポンスにCORSヘッダーが含まれていない可能性があります。

**解決策**:
1. Authorizerを無効化して、Lambda関数内で認証チェックを行う（既に実装済み）
2. または、AuthorizerのレスポンステンプレートにCORSヘッダーを追加する

## 参考リンク

- [API Gateway ゲートウェイレスポンスの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html)
- [API Gateway CORSの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-cors.html)
- [API Gateway REST APIでのエラーレスポンスの処理](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-handle-errors.html)

