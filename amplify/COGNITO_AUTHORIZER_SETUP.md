# CognitoAuthorizer設定ガイド

既存のAPI Gateway `a1kintaiAPI`（REST API、ID: `tv731cev0j`）で、`CognitoAuthorizer`が401 Unauthorizedエラーを返している問題を解決する手順です。

## 問題の概要

CloudWatch Logsから、GETリクエスト（`/api/v1/auth/authorize`）が401 Unauthorizedエラーになっていることが確認されました。しかし、Lambda関数のログにはGETリクエストが到達していません。

**原因**: 
- `/{proxy+}`リソースの`ANY`メソッドに`CognitoAuthorizer`が設定されている
- `CognitoAuthorizer`がGETリクエストを認証チェックでブロックし、401エラーを返している
- `CognitoAuthorizer`が401を返すと、Lambda関数に到達する前にリクエストが拒否される

**解決方法**: 
1. `CognitoAuthorizer`の設定を確認・修正する（推奨）
2. または、`ANY`メソッドから`CognitoAuthorizer`を削除し、Lambda関数内で認証チェックを行う（既に実装済み）

## 解決手順

### 方法1: CognitoAuthorizerの設定を確認・修正（推奨）

`CognitoAuthorizer`が正しく設定されているか確認し、必要に応じて修正します。

1. **API Gateway**コンソールにアクセス
2. **`a1kintaiAPI`**を選択
3. 左側のメニューから**「オーソライザー」**を選択
4. **`CognitoAuthorizer`**を選択
5. 以下の設定を確認：
   - **タイプ**: `COGNITO_USER_POOLS`または`TOKEN`であること
   - **ユーザープール**: 正しいCognito User Poolが選択されていること
   - **ユーザープール ARN**: 正しいARNが設定されていること（例: `arn:aws:cognito-idp:ap-northeast-1:ACCOUNT_ID:userpool/USER_POOL_ID`）
   - **トークンソース**: `Authorization`または`authorization`が設定されていること

6. **保存**をクリック

### 方法2: ANYメソッドからCognitoAuthorizerを削除（Lambda関数内で認証チェック）

既にLambda関数内で認証チェックを実装している場合、API Gatewayの`CognitoAuthorizer`を削除できます：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**ANY**メソッドを選択
2. **メソッドリクエスト**タブをクリック
3. **認可（Authorization）**セクションで、**なし（NONE）**を選択
4. **保存**をクリック
5. **APIをデプロイ**して変更を反映

**注意**: `ANY`メソッドから`CognitoAuthorizer`を削除すると、すべてのHTTPメソッド（GET、POST、PUT、DELETEなど）が認証なしでLambda関数に到達します。Lambda関数内で認証チェックを行う必要があります（既に実装済み）。

### 方法3: GETメソッドを個別に作成して認証なしに設定

`ANY`メソッドの`CognitoAuthorizer`は維持しつつ、GETメソッドを個別に作成して認証なしに設定します：

1. **API Gateway**コンソールで、`/{proxy+}`リソースを選択
2. **アクション**ドロップダウンから**「メソッドの作成」**を選択
3. **GET**メソッドを選択し、チェックマーク（✓）をクリック
4. **統合タイプ**を選択（**Lambda関数**または**プロキシ統合**）
   - 既存の`ANY`メソッドと同じLambda関数を選択
5. **保存**をクリック
6. **GET**メソッドを選択（左側のリソースツリーから）
7. **メソッドリクエスト**タブをクリック
8. **認可（Authorization）**セクションで、**なし（NONE）**を選択
9. **保存**をクリック
10. **APIをデプロイ**して変更を反映

**重要**: API Gateway REST APIでは、より具体的なメソッド（GET）が`ANY`メソッドより優先されます。そのため、GETメソッドを個別に作成すると、GETリクエストはGETメソッドで処理され、`ANY`メソッドの`CognitoAuthorizer`は適用されません。

### 方法4: CognitoAuthorizerのレスポンステンプレートにCORSヘッダーを追加

`CognitoAuthorizer`が401を返す場合でも、CORSヘッダーを返すように設定できます：

1. **API Gateway**コンソールで、**オーソライザー**を選択
2. **`CognitoAuthorizer`**を選択
3. **認証レスポンス**タブをクリック
4. **401 Unauthorized**レスポンスを展開
5. **ヘッダーマッピング**を追加：
   - `Access-Control-Allow-Origin`: `'http://localhost:5173'`（シングルクォートで囲む）
   - `Access-Control-Allow-Methods`: `'GET,POST,PUT,PATCH,DELETE,OPTIONS'`（シングルクォートで囲む）
   - `Access-Control-Allow-Headers`: `'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id'`（シングルクォートで囲む）
   - `Access-Control-Allow-Credentials`: `'true'`（シングルクォートで囲む）
6. **保存**をクリック
7. **APIをデプロイ**して変更を反映

ただし、この方法でも`CognitoAuthorizer`が401を返す限り、Lambda関数には到達しません。

## AWS CLIでの設定

### ANYメソッドからCognitoAuthorizerを削除

```bash
# リソースIDを取得
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id tv731cev0j \
  --query 'items[?path==`/{proxy+}`].id' \
  --output text \
  --region ap-northeast-1)

# ANYメソッドの認証を無効化
aws apigateway update-method \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method ANY \
  --patch-ops op=replace,path=/authorizationType,value=NONE \
  --region ap-northeast-1

# 変更を反映するためにAPIをデプロイ
aws apigateway create-deployment \
  --rest-api-id tv731cev0j \
  --stage-name dev \
  --region ap-northeast-1
```

### GETメソッドを作成して認証なしに設定

```bash
# リソースIDを取得（/{proxy+}リソースのID）
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id tv731cev0j \
  --query 'items[?path==`/{proxy+}`].id' \
  --output text \
  --region ap-northeast-1)

# ANYメソッドの統合情報を取得（GETメソッドでも同じ統合を使用するため）
ANY_METHOD=$(aws apigateway get-method \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method ANY \
  --region ap-northeast-1)

# ANYメソッドの統合URIを取得
INTEGRATION_URI=$(echo $ANY_METHOD | jq -r '.methodIntegration.uri')
echo "Integration URI: $INTEGRATION_URI"

# GETメソッドを作成（認証なし）
aws apigateway put-method \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region ap-northeast-1

# GETメソッドの統合を設定（ANYメソッドと同じ統合を使用）
aws apigateway put-integration \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "$INTEGRATION_URI" \
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
3. APIリクエストを送信（`/api/v1/auth/authorize`へのGETリクエスト）
4. **GETリクエスト**が**200 OK**または**401 Unauthorized**（Lambda関数から返される）で返されることを確認
5. **CloudWatch Logs**で、Lambda関数のログにGETリクエストが記録されているか確認

## トラブルシューティング

### GETリクエストが依然としてLambda関数に到達しない場合

1. **API Gatewayのデプロイを確認**
   - API Gatewayの変更は、デプロイしないと反映されません
   - ステージ（`dev`）にデプロイされているか確認してください

2. **メソッドの優先順位を確認**
   - より具体的なメソッド（GET）が`ANY`メソッドより優先されます
   - `/{proxy+}`リソースにGETメソッドが個別に定義されているか確認してください

3. **CognitoAuthorizerの設定を確認**
   - `CognitoAuthorizer`が正しく設定されているか確認
   - ユーザープールARNが正しいか確認
   - トークンソースが`Authorization`に設定されているか確認

4. **Lambda関数のログを確認**
   - CloudWatch Logsで、Lambda関数が呼び出されているか確認
   - GETリクエストのログが記録されているか確認

### CognitoAuthorizerが常に401を返す場合

1. **トークンの形式を確認**
   - トークンが`Bearer <token>`の形式で送信されているか確認
   - トークンが有効期限内であるか確認

2. **ユーザープールの設定を確認**
   - トークンを発行したUser Poolと、`CognitoAuthorizer`で指定したUser Poolが一致しているか確認
   - User PoolのクライアントIDが正しいか確認

3. **トークンソースを確認**
   - `CognitoAuthorizer`のトークンソースが`Authorization`に設定されているか確認
   - リクエストヘッダーに`Authorization`ヘッダーが含まれているか確認

## 推奨解決方法

**推奨**: 方法2または方法3を使用してください。

- **方法2**（`ANY`メソッドから`CognitoAuthorizer`を削除）: 
  - Lambda関数内で認証チェックを行うため、より柔軟に認証ロジックを制御できます
  - 既にLambda関数内で認証チェックを実装しているため、この方法が最適です

- **方法3**（GETメソッドを個別に作成）: 
  - `ANY`メソッドの`CognitoAuthorizer`を維持しつつ、特定のメソッド（GET）のみ認証なしに設定できます
  - 他のメソッド（POST、PUT、DELETEなど）は`CognitoAuthorizer`で保護されます

## 参考リンク

- [API Gateway Authorizerの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
- [Cognito User Pool Authorizerの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
- [API Gateway REST APIでのメソッドの優先順位](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-method-settings.html)

