# Quick Start (10 min)

If you are new to Airship, follow this page only.

## Goal

Publish one iOS OTA update to `staging`, then promote to `production`.

## 0) One-Time Setup in Dashboard

1. Create an app in **Apps** (example: `my-app`).
2. Create an API token in **Tokens**.

## 1) Copy-Paste Flow (CLI)

```bash
export AIRSHIP_SERVER_URL="http://<your-server>"
export AIRSHIP_TOKEN="airship_xxx..."
export AIRSHIP_ADMIN_SECRET="$AIRSHIP_TOKEN"   # publish script uses this name
export AIRSHIP_APP_KEY="my-app"
export AIRSHIP_RUNTIME_VERSION="1.0.0"

npx expo export --platform ios --output-dir dist

BUNDLE_PATH="$(ls -1 dist/bundles/ios-*.js 2>/dev/null | head -n 1)"
if [ -z "$BUNDLE_PATH" ]; then
  echo "iOS bundle not found under dist/bundles"
  exit 1
fi

./scripts/publish-update.sh \
  --app-key "$AIRSHIP_APP_KEY" \
  --runtime-version "$AIRSHIP_RUNTIME_VERSION" \
  --platform ios \
  --bundle "$BUNDLE_PATH"
```

Expected: update appears in Dashboard and is assigned to `staging`.

## 2) Promote to Production

1. Open the uploaded update detail page.
2. In **Promote**, choose `staging -> production`.
3. Keep rollout `100%`, then click **Promote**.

## 3) Validate (No False Positive)

```bash
curl -sS -X POST "$AIRSHIP_SERVER_URL/api/apps/$AIRSHIP_APP_KEY/manifest" \
  -H "expo-platform: ios" \
  -H "expo-runtime-version: $AIRSHIP_RUNTIME_VERSION" \
  -H "expo-channel-name: production" > /tmp/airship-manifest.out

if grep -q 'noUpdateAvailable' /tmp/airship-manifest.out; then
  echo "No update delivered (check channel/runtime/version)"
else
  echo "Update manifest delivered"
fi
```

## Common Errors

- `401 Unauthorized`: token missing/invalid/revoked.
- `App not found`: wrong app key.
- `no such table: api_tokens`: server migration not applied.

## Next

- Daily publish + CI: `docs/ota-publish-guide.md`
- Staging verification: `docs/staging-cross-platform-checklist.md`
- Production ops: `docs/production-operations-checklist.md`
