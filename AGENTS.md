# AGENTS Instructions

## UI changes and snapshots
- If a pull request includes a user-visible UI change, set up snapshot dependencies first with `npm run setup:snapshot`.
- Then run `npm run snapshot:ui` to create the screenshot.
- The default output is `artifacts/ui-snapshot.png`.
- Attach the screenshot in the PR description with Markdown, for example:
  `![UI snapshot](artifacts/ui-snapshot.png)`
- If snapshot generation fails due to environment limitations (for example missing browser binaries), document the failure reason in the PR description and include any logs.
## 言語ポリシー
- プルリクエストのタイトル・本文は日本語で記述してください。
- README を含むプロジェクト内ドキュメントの追記・更新は日本語で記述してください。

## ネットワークポリシー
- ネットワークのドメインの許可リストに追加が必要な場合は、ユーザーに依頼してください。
