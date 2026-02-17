# Tic-Tac-Toe (Angular)

スマホでも遊べる、フロントエンドのみの三目並べアプリです。  
先手 (`X`)・後手 (`O`) はどちらも人間が操作します。

## ローカル実行

```bash
npm install
npm start
```

## GitHub Pages デプロイ

1. リポジトリ名を `tic-tac-toe` にする（base-hrefに使用）。
2. 本番ビルドを実行。

```bash
npm run build:gh-pages
```

3. 生成された `dist/tic-tac-toe/browser` の中身を `gh-pages` ブランチへ配置して公開。

GitHub Actionsを使う場合は、`dist/tic-tac-toe/browser` を Pages Artifact としてアップロードしてください。
