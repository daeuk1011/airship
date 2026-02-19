# OTA Publish Guide

Use this guide after completing `docs/quick-start.md`.

## Daily Dashboard Flow (Recommended)

1. Open **Apps > <appKey>**.
2. In **Upload Update**:
   - Choose platform (`iOS`, `Android`, or `iOS + Android`).
   - Verify runtime/channel values.
   - Upload bundle files.
3. Click **Check** and confirm preflight results.
4. Keep **Auto promote after upload** OFF (default).
5. Click **Upload**.
6. Promote `staging -> production` manually.

Why this flow: preflight catches obvious mistakes before S3 upload/commit.

## Optional Auto Promote (Default OFF)

Enable only when your release process is stable.

- Toggle: **Auto promote after upload**
- Source channel: upload channel (for example `staging`)
- Target channel: usually `production`
- Rollout: `0-100`

Safety checks:
- Source and target channels must be different.
- Invalid rollout values are blocked.

## CLI Flow

```bash
export AIRSHIP_SERVER_URL="https://ota.example.com"
export AIRSHIP_TOKEN="airship_xxx..."
export AIRSHIP_ADMIN_SECRET="$AIRSHIP_TOKEN"
export AIRSHIP_APP_KEY="my-app"
export AIRSHIP_RUNTIME_VERSION="1.0.0"

npx expo export --platform ios --output-dir dist
BUNDLE_PATH="$(ls -1 dist/bundles/ios-*.js 2>/dev/null | head -n 1)"

./scripts/publish-update.sh \
  --app-key "$AIRSHIP_APP_KEY" \
  --runtime-version "$AIRSHIP_RUNTIME_VERSION" \
  --platform ios \
  --bundle "$BUNDLE_PATH"
```

Then promote `staging -> production` from dashboard.

## Required Inputs

| Input | Example | Notes |
|---|---|---|
| `AIRSHIP_TOKEN` | `airship_xxx...` | Preferred token variable |
| `AIRSHIP_ADMIN_SECRET` | same as token | Script compatibility variable |
| `AIRSHIP_SERVER_URL` | `https://ota.example.com` | Base URL |
| `--app-key` | `my-app` | Existing app key |
| `--runtime-version` | `1.0.0` | Must match client runtime |
| `--platform` | `ios` / `android` | One platform per publish |
| `--bundle` | `dist/bundles/...js` | Exported bundle path |

## Script Options

```bash
./scripts/publish-update.sh --help
```

## CI Example (GitHub Actions)

```yaml
name: OTA Publish
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [ios, android]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: |
          npm ci
          npx expo export --platform ${{ matrix.platform }} --output-dir dist

      - run: |
          curl -sfO ${{ secrets.AIRSHIP_SERVER_URL }}/publish-update.sh
          chmod +x publish-update.sh

      - env:
          AIRSHIP_SERVER_URL: ${{ secrets.AIRSHIP_SERVER_URL }}
          AIRSHIP_TOKEN: ${{ secrets.AIRSHIP_TOKEN }}
        run: |
          export AIRSHIP_ADMIN_SECRET="$AIRSHIP_TOKEN"
          ./publish-update.sh \
            --app-key my-app \
            --runtime-version 1.0.0 \
            --platform ${{ matrix.platform }} \
            --bundle dist/bundles/${{ matrix.platform }}.js
```

## Troubleshooting

- `401 Unauthorized`: token missing/invalid/revoked
- `App not found`: wrong app key
- `Invalid request body`: check preflight/runtime/channel inputs
- `Bundle not found on S3`: upload URL expired or wrong key in commit
- `no such table: api_tokens`: migration not applied on server

## Next

- Staging verification: `docs/staging-cross-platform-checklist.md`
- Production ops: `docs/production-operations-checklist.md`
