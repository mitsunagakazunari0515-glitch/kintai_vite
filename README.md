## AWS Amplify React+Vite Starter Template

This repository provides a starter template for creating applications using React+Vite and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational React application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
  - Email/Password認証
  - Google OAuth認証（ソーシャルログイン）
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## 環境分離について

このプロジェクトは開発環境と本番環境で異なるCognitoユーザープールを使用します。

- **開発環境**: Amplifyサンドボックスが自動生成するユーザープール
- **本番環境**: 既存のユーザープール `a1kintai-webapp`

詳細な設定方法は [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) を参照してください。

## セットアップ

### Google OAuth認証の設定

1. **Google Cloud ConsoleでOAuth 2.0クライアントIDを作成**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクトを作成または選択
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuth 2.0クライアントID」を選択
   - アプリケーションの種類を「ウェブアプリケーション」に設定
   - 承認済みのリダイレクトURIに以下を追加：
     - `http://localhost:5173/` (開発環境)
     - `https://your-domain.com/` (本番環境)
   - クライアントIDとクライアントシークレットをコピー

2. **Amplify認証リソースの設定**
   - `amplify/auth/resource.ts`を開く
   - `YOUR_GOOGLE_CLIENT_ID`をGoogle OAuthクライアントIDに置き換え
   - `YOUR_GOOGLE_CLIENT_SECRET`をGoogle OAuthクライアントシークレットに置き換え
   - `redirectSignIn`と`redirectSignOut`のURLを実際のドメインに更新

3. **Amplifyサンドボックスの起動**
   ```bash
   npx ampx sandbox
   ```
   これにより`amplify_outputs.json`が生成されます。

4. **開発サーバーの起動**
   
   開発環境（Amplifyサンドボックス）:
   ```bash
   npm run dev:development
   # または
   npm run dev  # デフォルトは開発環境
   ```
   
   本番環境（既存のユーザープール）:
   ```bash
   npm run dev:production
   # または
   npm run dev:prod
   ```
   
   詳細は [ENVIRONMENT_SWITCH_GUIDE.md](ENVIRONMENT_SWITCH_GUIDE.md) を参照してください。

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.