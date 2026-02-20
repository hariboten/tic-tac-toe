import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src', 'app', 'version.ts');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

if (typeof packageJson.version !== 'string' || packageJson.version.trim() === '') {
  throw new Error('package.json の version が不正です');
}

const version = packageJson.version.trim();
const fileContent = `// このファイルは scripts/sync-version.mjs により自動生成されます。\nexport const APP_VERSION = '${version}';\n`;

await writeFile(versionTsPath, fileContent, 'utf8');
console.log(`version.ts を ${version} に同期しました`);
