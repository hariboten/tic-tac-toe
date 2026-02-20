import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

const bumpType = process.argv[2] ?? 'patch';
const validTypes = new Set(['major', 'minor', 'patch']);

if (!validTypes.has(bumpType)) {
  throw new Error(`不正な更新種別です: ${bumpType}（major|minor|patch を指定してください）`);
}

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const [majorText, minorText, patchText] = String(packageJson.version ?? '').split('.');
const major = Number(majorText);
const minor = Number(minorText);
const patch = Number(patchText);

if ([major, minor, patch].some((part) => Number.isNaN(part) || part < 0 || !Number.isInteger(part))) {
  throw new Error(`package.json の version が semver 形式ではありません: ${packageJson.version}`);
}

let nextMajor = major;
let nextMinor = minor;
let nextPatch = patch;

if (bumpType === 'major') {
  nextMajor += 1;
  nextMinor = 0;
  nextPatch = 0;
} else if (bumpType === 'minor') {
  nextMinor += 1;
  nextPatch = 0;
} else {
  nextPatch += 1;
}

const nextVersion = `${nextMajor}.${nextMinor}.${nextPatch}`;
packageJson.version = nextVersion;

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
console.log(`package.json の version を ${nextVersion} に更新しました`);

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(rootDir, 'scripts', 'sync-version.mjs')], {
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`sync-version に失敗しました（exit code: ${code ?? 'null'}）`));
  });

  child.on('error', reject);
});
