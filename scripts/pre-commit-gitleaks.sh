#!/usr/bin/env bash
# Install: ln -sf ../../scripts/pre-commit-gitleaks.sh .git/hooks/pre-commit
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found. Install with: brew install gitleaks" >&2
  exit 1
fi

gitleaks protect --staged --verbose --redact
