# Tic-Tac-Toe (Angular)

スマホでも遊べる、フロントエンドのみの三目並べアプリです。  
先手 (`X`)・後手 (`O`) はどちらも人間が操作します。

## ローカル実行

```bash
npm install
npm start
```

## GitHub Pages デプロイ（本番 + Pull Request Preview）

このリポジトリでは `gh-pages` ブランチに対して GitHub Actions でデプロイします。

- 本番: `master` への push で `gh-pages` のルート (`/`) を更新
- PR Preview: `gh-pages/pr-<PR番号>/` を更新
- PRクローズ時: `gh-pages/pr-<PR番号>/` を削除

本番デプロイ時は `pr-*` ディレクトリを保持するため、本番とPreviewが干渉しない構成です。

### 公開URL

- 本番: `https://<owner>.github.io/<repo>/`
- PR Preview: `https://<owner>.github.io/<repo>/pr-<PR番号>/`

例（このリポジトリ）:  
[https://hariboten.github.io/tic-tac-toe/](https://hariboten.github.io/tic-tac-toe/)

## セットアップ手順

1. GitHub の **Settings > Pages** を開く
2. **Build and deployment** の **Source** を **Deploy from a branch** にする
3. **Branch** で `gh-pages` / `/ (root)` を選択して保存
4. `master` に push して本番デプロイを確認
5. PR を作成して Preview URL の自動コメントを確認

## 実行フロー

### 1) 本番デプロイ (`.github/workflows/deploy.yml`)

- トリガー: `master` への push / 手動実行
- 処理:
  1. 依存関係のインストール
  2. テスト実行
  3. 本番ビルド（`npm run build:gh-pages`）
  4. `gh-pages` ブランチのルートのみを更新（`pr-*` は保持）

### 2) PR Preview (`.github/workflows/pr-preview.yml`)

- トリガー: `pull_request` (`opened`, `synchronize`, `reopened`, `closed`)
- 処理（opened/synchronize/reopened）:
  1. 依存関係のインストール
  2. テスト実行
  3. PR専用の base href でビルド
  4. `gh-pages/pr-<PR番号>/` を更新
  5. PR に Preview URL を sticky コメントで投稿（重複防止）
- 処理（closed）:
  1. `gh-pages/pr-<PR番号>/` を削除
  2. PR の sticky コメントを更新して削除完了を通知

## Pull Request テンプレート

`.github/pull_request_template.md` を追加済みです。  
Preview URL はテンプレートに固定記述せず、Actions の自動コメントで案内します。

## ローカルでデプロイ用ビルドだけ確認する場合

```bash
npm run build:gh-pages
```
