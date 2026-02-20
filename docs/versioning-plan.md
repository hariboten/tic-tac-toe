# バージョン表示と自動インクリメント導入計画

## 背景
- 現状はアプリ画面からバージョン情報を確認できない。
- `package.json` の `version` は手動更新が前提で、更新漏れや運用負荷がある。

## 目的
1. アプリ画面に現在バージョンを表示し、利用者が確認できるようにする。
2. バージョン管理を運用しやすくするため、自動でパッチ番号をインクリメントできる仕組みを追加する。

## 対応方針

### 1. 画面へのバージョン表示
- `src/app/version.ts` を追加し、表示用の `APP_VERSION` 定数を管理する。
- `AppComponent` で `APP_VERSION` を公開し、テンプレート下部に `Version x.y.z` を表示する。

### 2. バージョン同期スクリプト
- `scripts/sync-version.mjs` を追加し、`package.json` の `version` を `src/app/version.ts` に反映する。
- `npm run build` / `npm run start` の前段で同期が走るよう `prebuild` / `prestart` を定義する。

### 3. 自動インクリメントスクリプト
- `scripts/bump-version.mjs` を追加し、`patch` をデフォルトとして `major|minor|patch` を指定可能にする。
- 実行時に `package.json` のバージョンを自動更新し、続けて同期スクリプトを呼び出して画面表示も更新する。
- `npm run version:bump`（patch）、`npm run version:bump:minor`、`npm run version:bump:major` を定義する。

### 4. ドキュメント更新
- README に「バージョン運用」節を追記し、利用手順を明確化する。

## 検証観点
- `npm run version:sync` で `src/app/version.ts` が更新されること。
- `npm run version:bump` 実行で `package.json` と `src/app/version.ts` の両方が更新されること。
- 既存ユニットテストが通ること。
