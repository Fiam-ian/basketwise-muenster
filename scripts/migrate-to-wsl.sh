#!/usr/bin/env bash
set -euo pipefail

# Copy the entire project into WSL; retain the Windows source as a backup.
grocery_source="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
grocery_destination="${1:-$HOME/Projects/groceries-compare}"

if ! command -v uname >/dev/null || [[ "$(uname -s)" != Linux ]]; then
  printf '%s\n' 'Run this script in your WSL Linux terminal.' >&2
  exit 1
fi
if [[ "$grocery_destination" != /* || "$grocery_destination" == /mnt/* ]]; then
  printf '%s\n' 'Choose an absolute destination inside the Linux filesystem, not /mnt.' >&2
  exit 1
fi
if [[ -e "$grocery_destination" || -L "$grocery_destination" ]]; then
  printf '%s\n' 'Destination already exists. Nothing was copied or overwritten.' >&2
  exit 1
fi
if [[ ! -f "$grocery_source/prototype/package.json" ]]; then
  printf '%s\n' 'Could not locate the source prototype. Nothing was copied.' >&2
  exit 1
fi

umask 077
mkdir -p -- "$(dirname -- "$grocery_destination")"
grocery_stage="$(mktemp -d "${grocery_destination}.transfer.XXXXXX")"
cleanup_grocery_stage() {
  if [[ -n "$grocery_stage" && -d "$grocery_stage" ]]; then
    rm -rf -- "$grocery_stage"
  fi
}
trap cleanup_grocery_stage EXIT
cp -a -- "$grocery_source/." "$grocery_stage/"
chmod 700 -- "$grocery_stage"
# No clobber, including a destination created while the copy was running.
mv -T -n -- "$grocery_stage" "$grocery_destination"
if [[ -d "$grocery_stage" ]]; then
  printf '%s\n' 'Destination appeared during copying. It was not overwritten.' >&2
  exit 1
fi
grocery_stage=""
trap - EXIT

printf 'Linux project: %s\n' "$grocery_destination"
printf '%s\n' 'Windows source preserved. Local audit files were copied without publishing them.'
printf 'Next working directory: cd %q\n' "$grocery_destination/prototype"
cd -- "$grocery_destination/prototype"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Copy complete. Native Linux Node.js >=22 is missing; tests and preview build were not run.'
  exit 0
fi
grocery_platform="$(node -p "process.platform" 2>/dev/null || true)"
grocery_node_major="$(node -p "Number(process.versions.node.split(String.fromCharCode(46))[0])" 2>/dev/null || true)"
if [[ "$grocery_platform" != linux || ! "$grocery_node_major" =~ ^[0-9]+$ ]] || (( grocery_node_major < 22 )); then
  printf '%s\n' 'Copy complete. Native Linux Node.js >=22 is required; tests and preview build were not run.'
  node --version || true
  exit 0
fi

node --version
node --test
node scripts/build-preview.mjs
if [[ -f local-data/muenster-coverage-2026-10-07.json ]]; then
  node scripts/inspect-coverage.mjs --file local-data/muenster-coverage-2026-10-07.json
fi
if command -v codex >/dev/null 2>&1; then
  printf 'Codex CLI available: %s\n' "$(command -v codex)"
fi
printf '%s\n' 'Linux checks finished. Continue development from this Linux copy.'

