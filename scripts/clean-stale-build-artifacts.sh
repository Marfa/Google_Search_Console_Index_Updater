#!/usr/bin/env bash
# Remove build artifacts older than MAX_AGE_DAYS (default 7).
# Safe to run manually or from post-commit hook.
set -euo pipefail

MAX_AGE_DAYS="${MAX_AGE_DAYS:-7}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

removed=0

remove_if_old() {
  local path="$1"
  if [[ -e "$path" ]] && find "$path" -maxdepth 0 -mtime +"$MAX_AGE_DAYS" | grep -q .; then
    rm -rf "$path"
    echo "removed: $path"
    removed=$((removed + 1))
  fi
}

if [[ -d dist ]]; then
  while IFS= read -r -d '' entry; do
    remove_if_old "$entry"
  done < <(find dist -mindepth 1 -maxdepth 1 -print0 2>/dev/null)
fi

while IFS= read -r -d '' file; do
  remove_if_old "$file"
done < <(
  find . \( -path ./node_modules -o -path ./.git -o -path ./dist \) -prune -o \
    \( -name '*.log' -o -name '*.blockmap' -o -name '.DS_Store' \) -print0 2>/dev/null
)

if [[ "$removed" -gt 0 ]]; then
  echo "clean-stale-build-artifacts: removed $removed item(s) older than ${MAX_AGE_DAYS} day(s)"
fi
