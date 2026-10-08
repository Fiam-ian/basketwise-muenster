#!/usr/bin/env bash
set -euo pipefail

# Publish an allowlisted source snapshot, preserving the development checkout.
case "${1:---check}" in
  --check|--publish) grocery_action="${1:---check}" ;;
  *) printf '%s\n' 'Usage: bash scripts/publish-wsl.sh [--check|--publish]' >&2; exit 1 ;;
esac
[[ $# -le 1 ]] || { printf '%s\n' 'Too many arguments.' >&2; exit 1; }
grocery_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd -- "$grocery_root"
for grocery_tool in node npm git gh rg; do
  command -v "$grocery_tool" >/dev/null || { printf 'Missing prerequisite: %s\n' "$grocery_tool" >&2; exit 1; }
done
node -e 'if (process.platform !== "linux" || Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || {
  printf '%s\n' 'Native Linux Node.js >=22 is required.' >&2; exit 1;
}
gh auth status
grocery_account="$(gh api user --jq .login)"
[[ "$grocery_account" == Fiam-ian ]] || { printf '%s\n' 'Authenticate GitHub CLI as Fiam-ian before publishing.' >&2; exit 1; }
npm test
npm run preview
grocery_assets=(AGENTS.md LICENSE README.md package.json dev-server.mjs .gitignore publish.ps1 index.html offers.html app.html app.css app.webmanifest app-sw.mjs app-icon-192.png app-icon-512.png styles.css favicon.svg preview.html src tests docs scripts data .github)
for grocery_asset in "${grocery_assets[@]}"; do
  [[ -e "$grocery_asset" && ! -L "$grocery_asset" ]] || { printf 'Missing or linked release asset: %s\n' "$grocery_asset" >&2; exit 1; }
done
if [[ "$grocery_action" == --check ]]; then
  printf '%s\n' 'Authenticated prerequisites, tests and preview passed. No repository was created or pushed.'
  exit 0
fi
grocery_release="$(mktemp -d /tmp/basketwise-release.XXXXXX)"
printf 'Retained release checkout: %s\n' "$grocery_release"
cp -a -- "${grocery_assets[@]}" "$grocery_release/"
cd -- "$grocery_release"
git init -b main
git add -- "${grocery_assets[@]}"
if git ls-files | rg '(^|/)(local-data|node_modules|\.tools)/|(^|/)\.env($|\.)'; then
  printf '%s\n' 'Excluded local material found in release; publication stopped.' >&2; exit 1
fi
git commit -m 'Add Münster grocery-planner demonstration prototype'
gh repo create Fiam-ian/basketwise-muenster --public \
  --description 'Open-source Münster grocery-trip planner prototype; synthetic price demo' \
  --source . --remote origin --push
printf '%s\n' 'Published: https://github.com/Fiam-ian/basketwise-muenster'
