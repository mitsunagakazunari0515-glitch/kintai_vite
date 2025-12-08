import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');

// publicディレクトリが存在しない場合は作成
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// 開発環境用: amplify_outputs.json（サンドボックスから生成）
const devSourceFile = join(projectRoot, 'amplify_outputs.json');
const devTargetFile = join(publicDir, 'amplify_outputs.json');

if (existsSync(devSourceFile)) {
  try {
    copyFileSync(devSourceFile, devTargetFile);
    console.log('✓ amplify_outputs.json (development) copied to public directory');
  } catch (error) {
    console.warn('⚠ Failed to copy amplify_outputs.json:', error.message);
  }
} else {
  console.warn('⚠ amplify_outputs.json not found. Run "npx ampx sandbox" to generate it.');
}

// 本番環境用: amplify_outputs.production.json（手動で作成する必要がある）
const prodSourceFile = join(projectRoot, 'amplify_outputs.production.json');
const prodTargetFile = join(publicDir, 'amplify_outputs.production.json');

if (existsSync(prodSourceFile)) {
  try {
    copyFileSync(prodSourceFile, prodTargetFile);
    console.log('✓ amplify_outputs.production.json copied to public directory');
  } catch (error) {
    console.warn('⚠ Failed to copy amplify_outputs.production.json:', error.message);
  }
} else {
  console.info('ℹ amplify_outputs.production.json not found. Create it for production environment.');
}

