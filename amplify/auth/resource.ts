import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 * 
 * Note: GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET は環境変数またはシークレットとして設定する必要があります
 * シークレットを設定するには: npx ampx sandbox secret set GOOGLE_CLIENT_ID
 *                           npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      callbackUrls: ['http://localhost:5173/', 'https://www.sys-a1int.work/'],
      logoutUrls: ['http://localhost:5173/login', 'https://www.sys-a1int.work/login'],
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email'],
      },
    },
  },
});
