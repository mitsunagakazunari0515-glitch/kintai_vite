import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
// AppSync + DynamoDBを使用しない場合は data をコメントアウト
// import { data } from './data/resource';

/**
 * バックエンドリソース定義
 * - auth: Cognito認証（ユーザープール）
 * 
 * 注意: 
 * - API Gateway + Lambda + RDS は既存のインフラを使用します
 * - API Gatewayエンドポイントは環境変数で設定してください（.envファイル）
 * - 例: VITE_API_ENDPOINT=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com
 */
defineBackend({
  auth,
  // data, // AppSync + DynamoDBを使用しない場合はコメントアウト
});
