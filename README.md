# Tic-Tac-Toe (Angular)

スマホでも遊べる、フロントエンドのみの三目並べアプリです。  
先手 (`X`)・後手 (`O`) はどちらも人間が操作します。

## ローカル実行

```bash
npm install
npm start
```

## GitHub Pages デプロイ

このリポジトリには、`main` ブランチへ push すると自動で GitHub Pages へデプロイする CI (`.github/workflows/deploy.yml`) を追加しています。

### 今すぐ遊べるページ

リポジトリを見に来てくれた方はこちらからどうぞ！  
[https://hariboten.github.io/tic-tac-toe/](https://hariboten.github.io/tic-tac-toe/)

### 初回に必要な GitHub 設定

1. GitHub の **Settings > Pages > Build and deployment** を開く
2. **Source** を `GitHub Actions` に設定する

### ローカルでデプロイ用ビルドだけ確認する場合

```bash
npm run build:gh-pages
```

GitHub Actions では `dist/tic-tac-toe/browser` を Pages Artifact としてアップロードして公開します。

## PR Preview (GitHub Pages + gh-pages ブランチ)

Pull Request ごとに GitHub Pages のプレビュー URL を自動生成する構成を追加しています。

- 本番: `https://<username>.github.io/<repo>/`
- PR: `https://<username>.github.io/<repo>/pr-preview/pr-<番号>/`

### GitHub Pages 設定手順（Deploy from a branch）

1. `gh-pages` ブランチを作成（空コミットでも可）
2. GitHub の **Settings > Pages > Build and deployment** を開く
3. **Source** を `Deploy from a branch` に設定
4. **Branch** を `gh-pages` / `/ (root)` に設定
5. 保存

### ディレクトリ構成の例（gh-pages ブランチ上）

```text
gh-pages
├─ index.html                 # 本番ページ（既存運用）
└─ pr-preview
   ├─ pr-12
   │  └─ index.html
   └─ pr-34
      └─ index.html
```

### 実行フロー

1. PR 作成/更新時に `.github/workflows/pr-preview.yml` が起動
2. Node.js セットアップ後に `npm ci` を実行し、`npm run build -- --configuration production --base-href "/<repo>/pr-preview/pr-<番号>/"` でプレビュー用にビルド
3. `dist/tic-tac-toe/browser` を `peaceiris/actions-gh-pages` で `gh-pages` の `pr-preview/pr-<番号>` へ配置
   - `keep_files: true` により本番ページ・他PR成果物は保持
4. `actions/github-script` で Preview URL コメントを PR に投稿
   - 既存コメントがあれば更新し、重複投稿を防止
5. PR クローズ時に `.github/workflows/pr-preview-cleanup.yml` が起動し、該当ディレクトリを削除

### fork 由来の PR に関する制約

fork からの `pull_request` イベントでは、`GITHUB_TOKEN` 権限が制限されるため以下が失敗する可能性があります。

- `gh-pages` への push（Preview デプロイ）
- PR コメントの作成/更新

必要に応じて、メンテナが `pull_request_target` ベースの運用を検討してください（ただしセキュリティ上の注意が必要）。
