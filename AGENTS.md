# Agent / AI assistant rules

## Dependencies

- **Never invent a package version from memory.** Install only with an explicit latest (or pinned) version resolved from the registry:
  - `npm install <pkg>@latest`
  - or `npm view <pkg> version` first, then install that exact version
- **After every install or upgrade**, run `npm audit` and report findings (especially `high` / `critical`).
- Before adding a new dependency, follow the project's `/check-dep` skill (registry status, maintenance, advisories, typosquatting).
- Prefer existing dependencies and the Node stdlib over new packages.
- Do not commit `package-lock.json` changes without also running `npm audit`.

## Secrets

- Never commit secrets, tokens, OAuth client secrets, or `.env` files.
- Real credentials go in local `config.json` / app `userData` only (see `.gitignore`).
- If a change might touch credentials, run `gitleaks detect --source .` before committing.

## Build artifacts

- Output lives in `dist/` (see `.gitignore`); also treat `*.log`, `*.blockmap`, and `.DS_Store` as disposable build/cache noise.
- After every commit, `post-commit` runs `scripts/clean-stale-build-artifacts.sh` and deletes those artifacts when they are older than 7 days.
- Install hooks locally:
  - `ln -sf ../../scripts/pre-commit-gitleaks.sh .git/hooks/pre-commit`
  - `ln -sf ../../scripts/post-commit-clean-artifacts.sh .git/hooks/post-commit`
- Manual cleanup: `scripts/clean-stale-build-artifacts.sh` (override age with `MAX_AGE_DAYS=14`).

## Security checks (when asked or before release)

1. `npm audit` — fail on critical in CI; investigate high.
2. `npx npm-check-updates` — report outdated direct deps (do not auto-bump majors without review).
3. Code review for Electron pitfalls: unvalidated `shell.openExternal`, XSS/`innerHTML`, navigation escaping the app origin, secrets over IPC.
4. `gitleaks detect --source .` — full git history for leaked secrets.
