import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { apiFunction } from './functions/api/resource';
// AppSync + DynamoDBを使用しない場合は data をコメントアウト
// import { data } from './data/resource';
import { Function } from 'aws-cdk-lib/aws-lambda';

/**
 * バックエンドリソース定義
 * - auth: Cognito認証（ユーザープール）
 * - apiFunction: Lambda関数（API処理）
 * 
 * 注意: 
 * - 既存のAPI Gateway `a1kintaiAPI`（REST API、ID: tv731cev0j）を使用しています
 * - API Gatewayのログ設定は、AWSコンソールまたは既存の管理方法で行ってください
 * - RDS接続情報は環境変数またはSecrets Managerから取得してください
 * - Cognito User Pool IDとClient IDは環境変数で設定してください
 * 
 * 既存のAPI Gateway `a1kintaiAPI`のログ設定については、
 * `amplify/API_GATEWAY_LOGGING_SETUP.md`を参照してください。
 */
const backend = defineBackend({
  auth,
  apiFunction,
  // data, // AppSync + DynamoDBを使用しない場合はコメントアウト
});

// Cognito User Pool情報をLambda関数の環境変数として設定
// Amplify Gen 2では、IFunction型にaddEnvironmentメソッドがないため、
// CDKでFunction型にアクセスして環境変数を設定します
// 実際のFunctionインスタンスにアクセスするために、型アサーションを使用します
const lambdaFunction = backend.apiFunction.resources.lambda as unknown as Function;
// addEnvironmentメソッドが存在することを確認してから呼び出します
if (lambdaFunction && typeof (lambdaFunction as any).addEnvironment === 'function') {
  (lambdaFunction as any).addEnvironment(
    'COGNITO_USER_POOL_ID',
    backend.auth.resources.userPool.userPoolId
  );
  (lambdaFunction as any).addEnvironment(
    'COGNITO_CLIENT_ID',
    backend.auth.resources.userPoolClient.userPoolClientId
  );
}
