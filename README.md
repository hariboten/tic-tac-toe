# Tic-Tac-Toe (Angular)

スマホでも遊べる、フロントエンドのみの三目並べアプリです。  
先手（`X`）・後手（`O`）それぞれに操作エージェントを設定して対戦できます。

## 公開URL

- 本番: https://hariboten.github.io/tic-tac-toe/

## 主な機能

- 先手・後手ごとに操作エージェントを選択
  - ヒューマン
  - ランダム
  - モンテカルロ
  - ミニマックス
- ブラウザ上で完結するシンプルな対戦UI

## 設計ドキュメント

- [Qエージェント（Q学習）のリファクタリング計画](docs/q-learning-agent-refactor-plan.md)

## ローカル実行

```bash
npm install
npm start
```

開発サーバー起動後、`http://localhost:4200/` にアクセスしてください。

## テスト

```bash
npm test
```

## ビルド

```bash
npm run build
```

GitHub Pages 向けビルドを確認する場合は次を実行します。

```bash
npm run build:gh-pages
```
