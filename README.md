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

### 初回に必要な GitHub 設定

1. GitHub の **Settings > Pages > Build and deployment** を開く
2. **Source** を `GitHub Actions` に設定する

### ローカルでデプロイ用ビルドだけ確認する場合

```bash
npm run build:gh-pages
```

GitHub Actions では `dist/tic-tac-toe/browser` を Pages Artifact としてアップロードして公開します。
