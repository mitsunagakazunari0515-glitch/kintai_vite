import { defineFunction } from '@aws-amplify/backend';
import { secret } from '@aws-amplify/backend';

/**
 * API Lambda関数の定義
 * すべてのAPIエンドポイントを処理する単一のLambda関数
 */
export const apiFunction = defineFunction({
  name: 'kintai-api',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 30,
  memoryMB: 512,
  // Amplify Gen 2では、Lambda関数の依存関係は、Lambda関数のディレクトリ内のpackage.jsonから自動的に読み込まれます
  // バンドル時に自動的にインストールされるため、bundlingオプションは通常不要です
  environment: {
    // Cognito User Pool情報は、backend.ts内で環境変数として設定されます
    // Amplify Gen 2では、auth.resourcesに直接アクセスすることはできません
    // 代わりに、backend.ts内でリソースにアクセスして環境変数を設定します
    // RDS接続情報（環境変数またはSecrets Managerから取得）
    // 注意: 環境変数は実際のデプロイ時に設定してください
    // DB_HOST: secret('DB_HOST'),
    // DB_PORT: secret('DB_PORT'),
    // DB_NAME: secret('DB_NAME'),
    // DB_USER: secret('DB_USER'),
    // DB_PASSWORD: secret('DB_PASSWORD'),
  },
});

