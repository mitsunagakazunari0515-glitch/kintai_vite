# API Gateway ログ設定ガイド

既存のAPI Gateway `a1kintaiAPI`（REST API、ID: `tv731cev0j`）のCloudWatch Logsへのアクセスログを有効化する手順です。

## ログの種類について

API Gatewayには**実行ログ（Execution Logs）**と**アクセスログ（Access Logs）**の2種類のログがあります：

### 実行ログ（Execution Logs）

既に有効化されているログです。以下のような情報が記録されます：

- Authorizerの実行状況（`Starting authorizer`）
- リクエストの処理状況（`Unauthorized request`など）
- X-RayトレーシングID
- Extended Request ID
- エラーの詳細

**例:**
```
2026-01-10T11:04:45.964Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Extended Request Id: W9zMPGrHtjMEeFw=
2026-01-10T11:04:45.966Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Starting authorizer: 4hugyv for request: 9cef3834-f42c-46d7-83fe-a6401a431398
2026-01-10T11:04:45.966Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Unauthorized request: 9cef3834-f42c-46d7-83fe-a6401a431398
2026-01-10T11:04:45.966Z
(9cef3834-f42c-46d7-83fe-a6401a431398) X-ray Tracing ID : Root=1-6962324d-273b8749616a929c8bd4fd14
```

**ロググループ**: `/aws/apigateway/a1kintaiAPI`（または自動生成されたロググループ）

### アクセスログ（Access Logs）

このドキュメントで設定するログです。リクエストの詳細情報が記録されます：

- リクエストID
- IPアドレス
- HTTPメソッド（GET、POSTなど）
- リソースパス
- ステータスコード
- レスポンス長
- リクエスト時間
- エラーメッセージ

**ロググループ**: `/aws/apigateway/a1kintaiAPI`（アクセスログ用に作成）

**注意**: 実行ログとアクセスログは別のロググループに記録されることがあります。実行ログは自動的に有効化される場合がありますが、アクセスログは明示的に設定する必要があります。

## 前提条件

- AWS CLIがインストールされていること
- 適切な権限を持つIAMユーザー/ロールでAWSにアクセスできること
- API Gateway `a1kintaiAPI`が存在し、デプロイ済みであること

## 手順1: CloudWatch Logs ロググループの作成

既存のAPI Gatewayの**アクセスログ**を保存するためのCloudWatch Logsロググループを作成します。

**注意**: 実行ログは既に記録されている可能性がありますが、アクセスログは別のロググループに記録されます。アクセスログ用のロググループを明示的に作成することを推奨します。

### AWS CLIでの作成

```bash
aws logs create-log-group \
  --log-group-name /aws/apigateway/a1kintaiAPI \
  --region ap-northeast-1
```

### ログ保持期間の設定（オプション）

ログを1週間保持する場合：

```bash
aws logs put-retention-policy \
  --log-group-name /aws/apigateway/a1kintaiAPI \
  --retention-in-days 7 \
  --region ap-northeast-1
```

## 手順2: IAMロールの作成と設定

API GatewayがCloudWatch Logsにログを書き込むためのIAMロールを作成します。

### IAMロールの作成

1. **AWSマネジメントコンソール**にアクセス
2. **IAM** > **ロール** > **ロールを作成**
3. **信頼されたエンティティタイプ**: 「AWS サービス」を選択
4. **ユースケース**: 「API Gateway」を選択
5. **次へ**をクリック

### 権限ポリシーの追加

**ポリシー名**: `API-Gateway-CloudWatch-Logs-Policy`

以下のJSONポリシーをアタッチします：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-northeast-1:*:*"
    }
  ]
}
```

または、既存のポリシー `AmazonAPIGatewayPushToCloudWatchLogs` をアタッチすることもできます。

### ロール名の設定

**ロール名**: `api-gateway-cloudwatch-logs-role`

ロールを作成後、**ARN**をメモしておきます（例: `arn:aws:iam::123456789012:role/api-gateway-cloudwatch-logs-role`）

### AWS CLIでの作成

IAMロールの信頼ポリシー（`trust-policy.json`）を作成：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

IAMロールの作成：

```bash
aws iam create-role \
  --role-name api-gateway-cloudwatch-logs-role \
  --assume-role-policy-document file://trust-policy.json \
  --region ap-northeast-1
```

既存のポリシーをアタッチ：

```bash
aws iam attach-role-policy \
  --role-name api-gateway-cloudwatch-logs-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs \
  --region ap-northeast-1
```

## 手順3: API Gateway ステージのログ設定

既存のAPI Gateway `a1kintaiAPI`のステージ（`dev`）にアクセスログを設定します。

### AWSコンソールでの設定

1. **API Gateway**コンソールにアクセス
2. **`a1kintaiAPI`**を選択
3. **ステージ** > **`dev`**を選択
4. **ログ/トレース**タブを開く
5. **CloudWatch Logs ロググループ ARN**に以下を入力：
   ```
   arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI
   ```
   （`YOUR_ACCOUNT_ID`は実際のAWSアカウントIDに置き換えてください）
   
   **重要**: 
   - ロググループARNの末尾に`:*`を追加**しないでください**
   - 許可される文字: `a-z`, `A-Z`, `0-9`, `_`, `-`, `/`, `.`
   - コロン（`:`）やアスタリスク（`*`）などの特殊文字は使用できません
   
   または、ロググループ名のみを指定する方法もあります（コンソールによって異なる場合があります）：
   ```
   /aws/apigateway/a1kintaiAPI
   ```
6. **ログレベル**: エラーとアクセスログを有効にするため、以下を選択：
   - **ERROR**: 有効
   - **INFO**: 有効（オプション、デバッグ時に有用）
7. **CloudWatch ログのロール ARN**に、手順2で作成したIAMロールのARNを入力：
   ```
   arn:aws:iam::YOUR_ACCOUNT_ID:role/api-gateway-cloudwatch-logs-role
   ```
8. **アクセスログ形式**を設定（JSON形式推奨）：

   **重要**: アクセスログ形式は**1行**で記述する必要があります。改行文字（`\n`）は末尾のみ許可されます。

   **コンソールでの入力**（1行で入力）：
   ```
   {"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}
   ```

   **読みやすい形式**（設定時は1行に変換してください）：
   ```json
   {
     "requestId": "$context.requestId",
     "ip": "$context.identity.sourceIp",
     "caller": "$context.identity.caller",
     "user": "$context.identity.user",
     "requestTime": "$context.requestTime",
     "httpMethod": "$context.httpMethod",
     "resourcePath": "$context.resourcePath",
     "status": "$context.status",
     "protocol": "$context.protocol",
     "responseLength": "$context.responseLength",
     "error": {
       "message": "$context.error.message",
       "messageString": "$context.error.messageString",
       "validationErrorString": "$context.error.validationErrorString"
     }
   }
   ```

9. **変更を保存**をクリック

### AWS CLIでの設定

```bash
# ステージのログ設定を更新
# 注意: destinationArnにはロググループARNのみを指定します（末尾に :* を追加しない）
# 注意: formatは1行で指定する必要があります（改行文字を含めない）
aws apigateway update-stage \
  --rest-api-id tv731cev0j \
  --stage-name dev \
  --patch-ops \
    op=replace,path=/accessLogSettings/destinationArn,value='arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI' \
    op=replace,path=/accessLogSettings/format,value='{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}' \
    op=replace,path=//*/logging/loglevel,value=INFO \
    op=replace,path=//*/logging/dataTrace,value=true \
  --region ap-northeast-1
```

**または、フォーマットを変数に格納して指定（推奨）**：

```bash
# アクセスログ形式を1行で定義（改行なし）
ACCESS_LOG_FORMAT='{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}'

aws apigateway update-stage \
  --rest-api-id tv731cev0j \
  --stage-name dev \
  --patch-ops \
    op=replace,path=/accessLogSettings/destinationArn,value='arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI' \
    op=replace,path=/accessLogSettings/format,value="$ACCESS_LOG_FORMAT" \
    op=replace,path=//*/logging/loglevel,value=INFO \
    op=replace,path=//*/logging/dataTrace,value=true \
  --region ap-northeast-1
```

**重要**: 
- `destinationArn`にはロググループARNのみを指定します（末尾に`:*`を追加**しないでください**）
- ロググループARNの正しい形式: `arn:aws:logs:<リージョン>:<アカウントID>:log-group:<ロググループ名>`
- `destinationArn`に許可される文字: `a-z`, `A-Z`, `0-9`, `_`, `-`, `/`, `.`
- コロン（`:`）やアスタリスク（`*`）などの特殊文字はロググループ名部分で使用できません
- `YOUR_ACCOUNT_ID`は実際のAWSアカウントIDに置き換えてください

### IAMロールの設定

API GatewayアカウントレベルのCloudWatch Logsロールを設定します：

```bash
aws apigateway update-account \
  --patch-ops op=replace,path=/cloudwatchRoleArn,value=arn:aws:iam::YOUR_ACCOUNT_ID:role/api-gateway-cloudwatch-logs-role \
  --region ap-northeast-1
```

## 手順4: ログの確認

設定が完了したら、APIリクエストを送信してログが記録されることを確認します。

### 実行ログ（Execution Logs）の確認

実行ログは既に記録されている可能性があります。以下のような形式で記録されます：

```
2026-01-10T11:04:45.964Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Extended Request Id: W9zMPGrHtjMEeFw=
2026-01-10T11:04:45.966Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Starting authorizer: 4hugyv for request: 9cef3834-f42c-46d7-83fe-a6401a431398
2026-01-10T11:04:45.966Z
(9cef3834-f42c-46d7-83fe-a6401a431398) Unauthorized request: 9cef3834-f42c-46d7-83fe-a6401a431398
```

**ロググループ**: `/aws/apigateway/a1kintaiAPI`（実行ログ用、自動生成される可能性があります）

### アクセスログ（Access Logs）の確認

アクセスログは、設定後に以下のような形式で記録されます（JSON形式の場合）：

```json
{
  "requestId": "9cef3834-f42c-46d7-83fe-a6401a431398",
  "ip": "203.0.113.1",
  "caller": "-",
  "user": "-",
  "requestTime": "10/Jan/2026:11:04:45 +0000",
  "httpMethod": "GET",
  "resourcePath": "/api/v1/auth/authorize",
  "status": 401,
  "protocol": "HTTP/1.1",
  "responseLength": 123,
  "error": {
    "message": "Unauthorized",
    "messageString": "Unauthorized request"
  }
}
```

**ロググループ**: `/aws/apigateway/a1kintaiAPI`（アクセスログ用、手順1で作成）

### CloudWatch Logsでの確認

1. **CloudWatch**コンソールにアクセス
2. **ログ** > **ロググループ**を選択
3. **`/aws/apigateway/a1kintaiAPI`**を選択（実行ログとアクセスログが混在する場合があります）
4. ログストリームが作成され、リクエストログが記録されていることを確認

**注意**: 実行ログとアクセスログが同じロググループに記録される場合、ログストリーム名やログ形式で区別できます。アクセスログは設定したフォーマット（JSON形式など）で記録され、実行ログは上記の形式で記録されます。

### AWS CLIでの確認

```bash
# ロググループの存在確認
aws logs describe-log-groups \
  --log-group-name-prefix /aws/apigateway/a1kintaiAPI \
  --region ap-northeast-1

# ログストリームの確認
aws logs describe-log-streams \
  --log-group-name /aws/apigateway/a1kintaiAPI \
  --region ap-northeast-1 \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# 最新のログイベントを取得
aws logs tail /aws/apigateway/a1kintaiAPI \
  --follow \
  --region ap-northeast-1
```

## トラブルシューティング

### エラー: "Invalid ARN specified in the request. ARN vendor should be 'logs'"

このエラーは、API Gatewayのアクセスログ設定でCloudWatch LogsのロググループARNの形式が間違っている場合に発生します。

**原因**:
- ロググループARNの形式が正しくない
- サービスプレフィックスが`logs`でない

**解決方法**:

1. **ロググループARNの正しい形式を確認**
   - 正しい形式: `arn:aws:logs:<リージョン>:<アカウントID>:log-group:<ロググループ名>`
   - 例: `arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/apigateway/a1kintaiAPI`
   - **重要**: 末尾に`:*`を追加**しないでください**

2. **AWSコンソールでの設定**
   - **ログ/トレース**タブの**CloudWatch Logs ロググループ ARN**に、正しいARN形式を入力してください
   - ロググループ名のみを指定できる場合もあります（例: `/aws/apigateway/a1kintaiAPI`）

3. **AWS CLIでの設定**
   - `destinationArn`の値に、ロググループARNのみを指定してください（末尾に`:*`を追加しない）
   - 例: `arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI`

4. **ロググループの存在確認**
   - CloudWatch Logsでロググループが正しく作成されているか確認してください
   - ロググループ名に誤字がないか確認してください

### エラー: "Access log destination must only contain characters a-z, A-Z, 0-9, '_', '-', '/', '.': 'log-group:/aws/apigateway/a1kintaiAPI:*'"

このエラーは、`destinationArn`に無効な文字（コロン`:`やアスタリスク`*`など）が含まれている場合に発生します。

**原因**:
- `destinationArn`の末尾に`:*`が含まれている
- ロググループ名部分に無効な文字が含まれている

**解決方法**:

1. **`destinationArn`から`:*`を削除**
   - 正しい形式: `arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI`
   - 誤った形式: `arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI:*`

2. **許可される文字を確認**
   - `destinationArn`に許可される文字: `a-z`, `A-Z`, `0-9`, `_`, `-`, `/`, `.`
   - コロン（`:`）やアスタリスク（`*`）はロググループ名部分で使用できません

3. **AWS CLIでの修正例**
   ```bash
   # 正しい設定（:* なし）
   aws apigateway update-stage \
     --rest-api-id tv731cev0j \
     --stage-name dev \
     --patch-ops \
       op=replace,path=/accessLogSettings/destinationArn,value='arn:aws:logs:ap-northeast-1:YOUR_ACCOUNT_ID:log-group:/aws/apigateway/a1kintaiAPI' \
     --region ap-northeast-1
   ```

### エラー: "Access Log format must be single line, new line character is allowed only at end of the format"

このエラーは、アクセスログのフォーマットが複数行になっている場合に発生します。

**原因**:
- アクセスログ形式に改行文字（`\n`）が含まれている
- JSON形式を読みやすくするために複数行で記述している

**解決方法**:

1. **フォーマットを1行に変換**
   - アクセスログ形式は**1行**で指定する必要があります
   - 改行文字（`\n`）は末尾のみ許可されます

2. **正しい形式（1行）**:
   ```
   {"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}
   ```

3. **AWSコンソールでの設定**
   - **アクセスログ形式**フィールドに、上記の1行形式をコピー&ペーストしてください
   - 改行を入れずに、1行で入力してください

4. **AWS CLIでの修正例**
   ```bash
   # フォーマットを1行で定義（改行なし）
   ACCESS_LOG_FORMAT='{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}'
   
   aws apigateway update-stage \
     --rest-api-id tv731cev0j \
     --stage-name dev \
     --patch-ops \
       op=replace,path=/accessLogSettings/format,value="$ACCESS_LOG_FORMAT" \
     --region ap-northeast-1
   ```

5. **JSONを1行に変換する方法**（Linux/macOS）:
   ```bash
   # 複数行のJSONを1行に変換
   echo '{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","error":{"message":"$context.error.message","messageString":"$context.error.messageString","validationErrorString":"$context.error.validationErrorString"}}' | jq -c .
   ```

### ログが記録されない場合

1. **IAMロールの権限を確認**
   - API GatewayアカウントレベルのCloudWatch Logsロールが設定されているか確認
   - ロールに適切な権限が付与されているか確認

2. **ロググループの存在を確認**
   - CloudWatch Logsにロググループが作成されているか確認
   - ロググループ名が正しいか確認（`/aws/apigateway/a1kintaiAPI`）

3. **ステージの設定を確認**
   - ステージのアクセスログ設定が正しく設定されているか確認
   - ログレベルが適切に設定されているか確認
   - **destinationArn**が正しい形式（末尾に`:*`を含む）で設定されているか確認

4. **APIリクエストが送信されているか確認**
   - 実際にAPIリクエストを送信してログが生成されるか確認

### エラー: "User: ... is not authorized to perform: logs:CreateLogGroup"

IAMロールに`logs:CreateLogGroup`権限がない場合に発生します。手順2を再確認して、適切な権限を付与してください。

### エラー: "CloudWatch Logs role ARN must be set in account settings"

API GatewayアカウントレベルのCloudWatch Logsロールが設定されていない場合に発生します。手順3の最後の「IAMロールの設定」を実行してください。

## 参考リンク

- [API Gateway アクセスログの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/set-up-logging.html)
- [CloudWatch Logs ロググループの作成](https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html)
- [API Gateway ログ形式の変数](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#context-variable-reference)

