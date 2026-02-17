#!/usr/bin/env bash
set -euo pipefail

npm ci

if [[ "$(uname -s)" == "Linux" ]]; then
  npx playwright install chromium --with-deps
else
  npx playwright install chromium
fi
