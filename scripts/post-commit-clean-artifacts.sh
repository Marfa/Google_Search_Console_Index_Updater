#!/usr/bin/env bash
# Install: ln -sf ../../scripts/post-commit-clean-artifacts.sh .git/hooks/post-commit
set -euo pipefail

"$(git rev-parse --show-toplevel)/scripts/clean-stale-build-artifacts.sh"
