# API Gateway OPTIONSリクエスト（CORSプリフライト）設定ガイド

既存のAPI Gateway `a1kintaiAPI`（REST API、ID: `tv731cev0j`）で、OPTIONSリクエスト（CORSプリフライト）が401 Unauthorizedエラーになる問題を解決する手順です。

## 問題の概要

アクセスログから、OPTIONSリクエスト（CORSプリフライト）が401 Unauthorizedエラーになっていることが確認されました：

```json
{
  "requestId": "c2ab2825-150b-486d-abb2-efc9f98fad06",
  "httpMethod": "OPTIONS",
  "resourcePath": "/{proxy+}",
  "status": "401",
  "error": {
    "message": "Unauthorized",
    "messageString": ""Unauthorized""
  }
}
```

**原因**: API GatewayのAuthorizerがOPTIONSリクエストに対しても実行され、認証が失敗しているためです。

**解決方法**: OPTIONSメソッドに対してAuthorizerを無効化する必要があります。

## 解決手順

### 方法1: API GatewayコンソールでOPTIONSメソッドを作成して認証なしに設定（推奨）

現在、`/{proxy+}`リソースには`ANY`メソッドのみが設定されているため、OPTIONSリクエストも`ANY`メソッドで処理され、CognitoAuthorizerが適用されています。

OPTIONSメソッドを個別に作成して、認証なしで設定する必要があります：

1. **API Gateway**コンソールにアクセス
2. **`a1kintaiAPI`**を選択
3. **リソース**タブを選択
4. **`/{proxy+}`**リソースを選択
5. **アクション**ドロップダウンから**メソッドの作成**を選択
6. **OPTIONS**メソッドを選択
7. **チェックマーク**（✓）をクリックしてOPTIONSメソッドを作成

次に、OPTIONSメソッドの統合を設定：

8. **統合タイプ**を選択（**Lambda関数**または**プロキシ統合**）
   - 既存の`ANY`メソッドと同じLambda関数を選択
   - **プロキシ統合の使用**にチェックを入れる（推奨）
9. **保存**をクリック

次に、OPTIONSメソッドの認証を無効化：

10. **OPTIONS**メソッドを選択（左側のリソースツリーから）
11. **メソッドリクエスト**タブをクリック
12. **認可（Authorization）**セクションで、**なし（NONE）**を選択
13. **保存**をクリック

14. **APIをデプロイ**して変更を反映：
    - 画面上部の**API アクション**ドロップダウンから**API をデプロイ**を選択
    - **デプロイステージ**で`dev`を選択
    - **デプロイ**をクリック

**重要**: API Gateway REST APIでは、より具体的なメソッド（OPTIONS）が`ANY`メソッドより優先されます。そのため、OPTIONSメソッドを個別に作成すると、OPTIONSリクエストはOPTIONSメソッドで処理され、認証なしで実行されます。

### 方法2: AWS CLIでOPTIONSメソッドを作成して認証なしに設定

```bash
# リソースIDを取得（/{proxy+}リソースのID）
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id tv731cev0j \
  --query 'items[?path==`/{proxy+}`].id' \
  --output text \
  --region ap-northeast-1)

echo "Resource ID: $RESOURCE_ID"

# ANYメソッドの統合情報を取得（OPTIONSメソッドでも同じ統合を使用するため）
ANY_METHOD=$(aws apigateway get-method \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method ANY \
  --region ap-northeast-1)

# ANYメソッドの統合URIを取得
INTEGRATION_URI=$(echo $ANY_METHOD | jq -r '.methodIntegration.uri')
echo "Integration URI: $INTEGRATION_URI"

# OPTIONSメソッドを作成（統合なしで作成）
aws apigateway put-method \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region ap-northeast-1

# OPTIONSメソッドの統合を設定（ANYメソッドと同じ統合を使用）
aws apigateway put-integration \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "$INTEGRATION_URI" \
  --region ap-northeast-1

# OPTIONSメソッドのレスポンスを設定（200 OK）
aws apigateway put-method-response \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters method.response.header.Access-Control-Allow-Origin=false \
  --region ap-northeast-1

# 変更を反映するためにAPIをデプロイ
aws apigateway create-deployment \
  --rest-api-id tv731cev0j \
  --stage-name dev \
  --region ap-northeast-1
```

**注意**: 
- `RESOURCE_ID`は`/{proxy+}`リソースのIDです（画像から`vrl85p`のようです）
- 統合URIは`ANY`メソッドと同じものを使用します
- `AWS_PROXY`統合タイプを使用する場合、統合レスポンスの設定は不要です（Lambda関数が直接レスポンスを返すため）

### 方法3: Lambda関数でOPTIONSリクエストを早期処理（既に実装済み）

Lambda関数（`amplify/functions/api/handler.ts`）では、既にOPTIONSリクエストを早期処理するコードが実装されています：

```typescript
// OPTIONSリクエストの処理（CORS preflight）
if (event.httpMethod === 'OPTIONS') {
  const corsHeaders = getCorsHeaders(event);
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: '',
  };
}
```

しかし、このコードが実行される前に、API GatewayのAuthorizerが実行されているため、401エラーが返されています。

**解決策**: 上記の方法1または方法2で、OPTIONSメソッドのAuthorizerを無効化してください。

## 確認方法

設定が正しく行われたか確認するには、以下の手順を実行してください：

1. **ブラウザの開発者ツール**を開く
2. **Network**タブを選択
3. APIリクエストを送信（任意のAPIエンドポイント）
4. **OPTIONS**リクエストが**200 OK**で返されることを確認
5. **アクセスログ**を確認して、OPTIONSリクエストの`status`が`200`になっていることを確認

## トラブルシューティング

### OPTIONSリクエストが依然として401エラーになる場合

1. **API Gatewayのデプロイを確認**
   - API Gatewayの変更は、デプロイしないと反映されません
   - ステージ（`dev`）にデプロイされているか確認してください

2. **リソースの階層を確認**
   - `/{proxy+}`リソースに直接OPTIONSメソッドが定義されているか確認
   - 親リソースのOPTIONSメソッドが継承されていないか確認

3. **Lambda関数のログを確認**
   - CloudWatch Logsで、OPTIONSリクエストがLambda関数に到達しているか確認
   - ログに「OPTIONS Request (CORS Preflight)」が記録されているか確認

### OPTIONSリクエストが200 OKを返しているが、CORSエラーが発生している場合

ログを見ると、OPTIONSリクエストは200 OKを返していますが、CORSエラーが発生している可能性があります：

```json
{
  "httpMethod": "OPTIONS",
  "status": "200",
  "responseLength": "0"
}
```

**原因**: 
- OPTIONSメソッドがLambda関数に統合されている場合、統合レスポンスのマッピングが正しく設定されていない可能性があります
- Lambda関数がCORSヘッダーを返していても、API Gateway REST APIで統合レスポンスのマッピングが設定されていないと、ヘッダーがクライアントに返されない可能性があります

**解決方法**:

#### 方法1: OPTIONSメソッドに統合レスポンスを設定（Lambda統合の場合）

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**OPTIONS**メソッドを選択
2. **統合レスポンス**タブをクリック
3. **200**ステータスコードを展開
4. **ヘッダーマッピング**を追加：
   - `Access-Control-Allow-Origin`: `'*'` または `'http://localhost:5173'`
   - `Access-Control-Allow-Methods`: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`
   - `Access-Control-Allow-Headers`: `'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'`
   - `Access-Control-Allow-Credentials`: `'true'`
5. **保存**をクリック
6. **APIをデプロイ**して変更を反映

#### 方法2: OPTIONSメソッドをMOCK統合に変更（推奨）

Lambda関数を使わず、API Gatewayで直接OPTIONSレスポンスを返す方法：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**OPTIONS**メソッドを選択
2. **統合リクエスト**タブをクリック
3. **統合タイプ**を**「MOCK」**に変更
4. **保存**をクリック
5. **統合レスポンス**タブをクリック
6. **200**ステータスコードを選択
7. **ヘッダーマッピング**を追加：
   ```
   Access-Control-Allow-Origin: 'http://localhost:5173'
   Access-Control-Allow-Methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
   Access-Control-Allow-Headers: 'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'
   Access-Control-Allow-Credentials: 'true'
   ```
8. **メソッドレスポンス**タブをクリック
9. **200**ステータスコードを展開
10. **ヘッダー**セクションで、上記のヘッダーを追加（すべてチェックボックスを有効化）
11. **保存**をクリック
12. **APIをデプロイ**して変更を反映

**注意**: MOCK統合を使用する場合、リクエストボディは不要なので、空のレスポンスを返します。

#### 方法3: プロキシ統合を使用し、Lambda関数でCORSヘッダーを返す（現在の方法）

現在の設定では、プロキシ統合を使用している場合、Lambda関数がCORSヘッダーを返す必要があります。

**確認ポイント**:
- Lambda関数のログで、OPTIONSリクエストが処理されているか確認
- Lambda関数が返すレスポンスにCORSヘッダーが含まれているか確認（CloudWatch Logs）
- API Gatewayの統合レスポンスのマッピングが正しく設定されているか確認

### OPTIONSリクエストがLambda関数に到達していない場合

API Gatewayの設定で、OPTIONSメソッドがLambda関数にルーティングされていない可能性があります。以下の手順で確認してください：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**OPTIONS**メソッドを選択
2. **統合リクエスト**をクリック
3. **統合タイプ**が「Lambda関数」または「プロキシ統合」になっているか確認
4. 統合されていない場合は、適切な統合を設定してください

**重要**: プロキシ統合を使用している場合でも、統合レスポンスのマッピングでヘッダーをマッピングする必要がある場合があります。API Gateway REST APIでは、Lambda関数からのレスポンスヘッダーをクライアントに返すために、統合レスポンスのマッピングが必要な場合があります。

## 参考リンク

- [API Gateway CORSの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-cors.html)
- [API Gateway REST APIでのOPTIONSメソッドの処理](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html)
- [API Gateway Authorizerの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)

