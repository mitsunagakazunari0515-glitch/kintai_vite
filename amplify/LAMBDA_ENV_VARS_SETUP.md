# Lambda関数の環境変数設定ガイド

既存のAPI Gateway `a1kintaiAPI`（REST API、ID: `tv731cev0j`）に関連付けられているLambda関数に、Cognito User Pool情報を環境変数として設定する手順です。

## 問題の概要

401 Unauthorizedエラーが発生している場合、Lambda関数の環境変数（`COGNITO_USER_POOL_ID`と`COGNITO_CLIENT_ID`）が正しく設定されていない可能性があります。

## 前提条件

- 既存のAPI Gateway `a1kintaiAPI`に関連付けられているLambda関数の名前を確認
- Cognito User Pool IDとClient IDを確認

## 手順1: Lambda関数名の確認

既存のAPI Gatewayに関連付けられているLambda関数を確認します。

### API Gatewayコンソールで確認

1. **API Gateway**コンソールにアクセス
2. **`a1kintaiAPI`**を選択
3. **リソース** > **`/{proxy+}`** > **ANY**メソッドを選択
4. **統合リクエスト**タブをクリック
5. **統合タイプ**が「Lambda関数」の場合、**Lambda関数名**をメモ（例: `kintai-api`、`a1kintaiAPI-handler`など）

### AWS CLIで確認

```bash
# リソースIDを取得
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id tv731cev0j \
  --query 'items[?path==`/{proxy+}`].id' \
  --output text \
  --region ap-northeast-1)

# ANYメソッドの統合を取得
aws apigateway get-integration \
  --rest-api-id tv731cev0j \
  --resource-id $RESOURCE_ID \
  --http-method ANY \
  --region ap-northeast-1 \
  --query 'uri' \
  --output text

# 出力例: arn:aws:apigateway:ap-northeast-1:lambda:path/2015-03-31/functions/arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:function:FUNCTION_NAME/invocations
# この中からFUNCTION_NAMEを抽出
```

## 手順2: Cognito User Pool IDとClient IDの確認

### Amplifyが作成したCognito User Poolの場合

```bash
# Amplify Sandboxを使用している場合、amplify_outputs.jsonから取得
cat amplify_outputs.json | jq '.auth.userPoolId'
cat amplify_outputs.json | jq '.auth.userPoolClientId'
```

### 既存のCognito User Poolの場合

1. **Cognito**コンソールにアクセス
2. 使用しているユーザープールを選択
3. **ユーザープール ID**をメモ
4. **アプリクライアント**タブで、**クライアント ID**をメモ

## 手順3: Lambda関数に環境変数を設定

### 方法1: AWSコンソールで設定（推奨）

1. **Lambda**コンソールにアクセス
2. 手順1で確認した**Lambda関数名**を選択
3. **設定**タブをクリック
4. **環境変数**をクリック
5. **編集**をクリック
6. 以下の環境変数を追加：
   - **キー**: `COGNITO_USER_POOL_ID`
   - **値**: Cognito User Pool ID（例: `ap-northeast-1_XXXXXXXXX`）
   - **キー**: `COGNITO_CLIENT_ID`
   - **値**: Cognito User Pool Client ID（例: `1234567890abcdefghijklmn`）
7. **保存**をクリック

### 方法2: AWS CLIで設定

```bash
# Lambda関数名を変数に設定（手順1で確認した関数名を使用）
LAMBDA_FUNCTION_NAME="your-lambda-function-name"

# 環境変数を設定
aws lambda update-function-configuration \
  --function-name $LAMBDA_FUNCTION_NAME \
  --environment Variables="{COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX,COGNITO_CLIENT_ID=1234567890abcdefghijklmn}" \
  --region ap-northeast-1
```

**注意**: 
- `COGNITO_USER_POOL_ID`と`COGNITO_CLIENT_ID`は、実際の値を置き換えてください
- 既存の環境変数がある場合、`--environment`オプションで既存の環境変数も含める必要があります

### 方法3: 既存の環境変数を保持しながら追加

```bash
# 既存の環境変数を取得
aws lambda get-function-configuration \
  --function-name $LAMBDA_FUNCTION_NAME \
  --query 'Environment.Variables' \
  --region ap-northeast-1

# 既存の環境変数を保持しながら新しい環境変数を追加
# 既存の環境変数がある場合は、それらも含めて設定する必要があります
aws lambda update-function-configuration \
  --function-name $LAMBDA_FUNCTION_NAME \
  --environment Variables="{EXISTING_VAR1=value1,EXISTING_VAR2=value2,COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX,COGNITO_CLIENT_ID=1234567890abcdefghijklmn}" \
  --region ap-northeast-1
```

## 手順4: Lambda関数が正しく設定されているか確認

### CloudWatch Logsで確認

1. **CloudWatch**コンソールにアクセス
2. **ログ** > **ロググループ**を選択
3. **`/aws/lambda/FUNCTION_NAME`**（FUNCTION_NAMEは手順1で確認した関数名）を選択
4. 最新のログストリームを開く
5. 以下のログが記録されているか確認：
   - `JWT Verifier created successfully`
   - `COGNITO_USER_POOL_ID: SET`
   - `COGNITO_CLIENT_ID: SET`
   - `✅ Token verified successfully`

### AWS CLIで確認

```bash
# 環境変数が正しく設定されているか確認
aws lambda get-function-configuration \
  --function-name $LAMBDA_FUNCTION_NAME \
  --query 'Environment.Variables' \
  --region ap-northeast-1
```

## トラブルシューティング

### エラー: "COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set"

このエラーは、Lambda関数の環境変数が設定されていない場合に発生します。

**解決方法**:
1. Lambda関数の環境変数を確認（手順3）
2. 環境変数名が正しいか確認（`COGNITO_USER_POOL_ID`と`COGNITO_CLIENT_ID`）
3. 値が正しいか確認（Cognito User Pool IDとClient ID）

### エラー: "Token verification failed"

このエラーは、JWT検証が失敗した場合に発生します。

**考えられる原因**:
1. **環境変数が間違っている**: Cognito User Pool IDまたはClient IDが間違っている
2. **トークンが無効**: トークンが期限切れまたは署名が無効
3. **User Poolが一致しない**: トークンを発行したUser Poolと、環境変数で指定したUser Poolが異なる

**解決方法**:
1. Lambda関数の環境変数を確認
2. CloudWatch Logsで詳細なエラーメッセージを確認
3. Cognito User Pool IDとClient IDが、トークンを発行したUser Poolと一致しているか確認

### 既存のAPI Gatewayと新しいLambda関数の接続

既存のAPI Gateway `a1kintaiAPI`を、`backend.ts`で定義された新しいLambda関数 `kintai-api`に接続する場合：

1. **API Gateway**コンソールで、`/{proxy+}`リソースの**ANY**メソッドを選択
2. **統合リクエスト**タブをクリック
3. **Lambda関数**に、新しいLambda関数名（`kintai-api`）を入力
4. **保存**をクリック
5. 許可を求められた場合は、**OK**をクリック
6. **APIをデプロイ**して変更を反映

## 参考リンク

- [Lambda関数の環境変数の設定](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/configuration-envvars.html)
- [API GatewayとLambda関数の統合](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-integration-settings-integration-response.html)
- [Cognito JWT検証](https://github.com/awslabs/aws-jwt-verify)

