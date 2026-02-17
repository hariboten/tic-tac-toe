# Tic-Tac-Toe (Angular)

スマホでも遊べる、フロントエンドのみの三目並べアプリです。  
先手 (`X`)・後手 (`O`) はどちらも人間が操作します。

## ローカル実行

```bash
npm install
npm start
```

## UIスナップショット

プルリクでUI変更をレビューしやすくするため、Playwrightで画面スナップショットを生成できます。

```bash
npm run setup:snapshot
npm run snapshot:ui
```

- `npm run setup:snapshot` で、必要な npm 依存関係と Playwright/Chromium 依存関係をセットアップします。
- デフォルトでは `artifacts/ui-snapshot.png` に保存されます。

## Pull Request運用

- UI変更を含むPRでは、`npm run setup:snapshot` の後に `npm run snapshot:ui` で最新のスクリーンショットを生成してください。
- PR本文には `![UI snapshot](artifacts/ui-snapshot.png)` の形式で画像を添付してください。
- 詳細は `AGENTS.md` と `.github/pull_request_template.md` を参照してください。

## GitHub Pages デプロイ

このリポジトリには、`main` ブランチへ push すると自動で GitHub Pages へデプロイする CI (`.github/workflows/deploy.yml`) を追加しています。

### 初回に必要な GitHub 設定

1. GitHub の **Settings > Pages > Build and deployment** を開く
2. **Source** を `GitHub Actions` に設定する

### ローカルでデプロイ用ビルドだけ確認する場合

```bash
npm run build:gh-pages
```

GitHub Actions では `dist/tic-tac-toe/browser` を Pages Artifact としてアップロードして公開します。
