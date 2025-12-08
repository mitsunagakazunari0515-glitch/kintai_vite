# API Gateway + Lambda + RDS 実装に関する注意事項

## 現在の状況

Amplify Gen 2には、AppSync + DynamoDB用の`defineData`はありますが、**API Gateway + Lambda用の直接的な`defineApi`関数は存在しない可能性があります**。

## 実装オプション

### オプション1: 既存のAPI Gateway + Lambdaを使用（推奨）

既存のAPI GatewayとLambda関数がある場合は、それらを参照するように設定：

1. 既存のAPI GatewayエンドポイントURLを取得
2. `amplify_outputs.json`または環境変数に設定
3. フロントエンドから直接呼び出し

```typescript
// フロントエンドから使用
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://your-api-id.execute-api.ap-northeast-1.amazonaws.com';

const response = await fetch(`${API_ENDPOINT}/employees`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### オプション2: CDKカスタムリソースとして実装

Amplify Gen 2では、CDKを使用してカスタムリソースを定義できます：

1. `amplify/custom/`ディレクトリにカスタムリソースを定義
2. API GatewayとLambda関数をCDKコンストラクトとして作成
3. RDSへの接続を設定

### オプション3: AWSコンソールで手動作成 + 参照

1. AWSコンソールでAPI GatewayとLambda関数を手動作成
2. Lambda関数にRDS接続コードを実装
3. 接続情報を環境変数で設定

## 次のステップ

### 1. Amplify Gen 2の最新ドキュメントを確認

API Gatewayのサポート状況を確認：
- [Amplify Gen 2 Functions](https://docs.amplify.aws/gen2/build-a-backend/functions/)
- [Amplify Gen 2 Custom Resources](https://docs.amplify.aws/gen2/build-a-backend/add-custom-resources/)

### 2. 既存インフラを確認

既存のAPI Gateway + Lambda + RDSがある場合：
- API GatewayエンドポイントURL
- Lambda関数のARN
- RDS接続情報（ホスト、ポート、データベース名、認証情報）

### 3. 実装方法の決定

- **既存インフラを使用**: 環境変数で設定
- **新規作成**: CDKカスタムリソースとして実装
- **ハイブリッド**: Lambda関数のみAmplifyで管理、API Gatewayは既存のものを使用

## 参考リソース

- [AWS CDK API Gateway](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html)
- [AWS CDK Lambda](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html)
- [Amplify Gen 2 Custom Resources](https://docs.amplify.aws/gen2/build-a-backend/add-custom-resources/)

