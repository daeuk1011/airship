# Runtime Version Guard (for App Repos)

Use this when you want to prevent accidental OTA breakage caused by native changes without a `runtimeVersion` bump.

This guide is for your **Expo app repository**, not the Airship server repository.

## Why this guard exists

Airship serves updates by `(runtimeVersion, platform, channel)`.

If native code changes but `runtimeVersion` stays the same, clients can receive incompatible JS/assets and fail at runtime.

This guard fails PRs when:
- native-related files changed, and
- `runtimeVersion` did not change.

## Template files in this repo

- Script template:
  - `docs/templates/runtime-version-guard/check-runtime-version.mjs`
- GitHub Actions template:
  - `docs/templates/runtime-version-guard/runtime-version-guard.yml`

## Install into your app repo

Copy templates into your app repository:

```bash
mkdir -p scripts/ci .github/workflows
cp /path/to/airship/docs/templates/runtime-version-guard/check-runtime-version.mjs scripts/ci/check-runtime-version.mjs
cp /path/to/airship/docs/templates/runtime-version-guard/runtime-version-guard.yml .github/workflows/runtime-version-guard.yml
```

Commit and open a PR.

## What the script checks

1. Collect changed files in the PR (`base...head`).
2. Match native-related paths (`ios/`, `android/`, `app.config.*`, `app.json`, `eas.json`, `plugins/`, `package.json`).
3. Read `runtimeVersion` from base/head refs (default: `app.json` at `expo.runtimeVersion`).
4. Fail if native-related changes exist and `runtimeVersion` did not change.

## Default assumptions

- Runtime source file: `app.json`
- Runtime JSON path: `expo.runtimeVersion`

If your app uses another file/path, override these in workflow env:

- `RUNTIME_VERSION_FILE`
- `RUNTIME_VERSION_JSON_PATH`
- `NATIVE_CHANGE_PATTERNS`

## Example bump policy

- JS/asset-only changes: keep same `runtimeVersion`
- Native/SDK/module/config-plugin changes: bump `runtimeVersion`

Example:
- `1.4.0` -> `1.4.1` when native changes are introduced.

## Local dry-run (optional)

From your app repo:

```bash
node scripts/ci/check-runtime-version.mjs <base-sha> <head-sha>
```

## Recommended release flow with Airship

1. Upload to `staging` (preflight check first)
2. Verify staging
3. Manually promote to `production`
4. Keep auto promotion OFF unless your team has stable guardrails
