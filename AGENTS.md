# AGENTS Instructions

## UI changes and snapshots
- If a pull request includes a user-visible UI change, set up snapshot dependencies first with `npm run setup:snapshot`.
- Then run `npm run snapshot:ui` to create the screenshot.
- The default output is `artifacts/ui-snapshot.png`.
- Attach the screenshot in the PR description with Markdown, for example:
  `![UI snapshot](artifacts/ui-snapshot.png)`
- If snapshot generation fails due to environment limitations (for example missing browser binaries), document the failure reason in the PR description and include any logs.
