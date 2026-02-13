# Quick Start (10 min)

If this is your first time using Airship, follow this page only.

## Goal

Deliver one OTA update to `staging`, then promote it to `production`.

## 1) Prepare Once

1. Create an app on Dashboard > **Apps** (example: `my-app`).
2. Create an API token on Dashboard > **Tokens**.
3. Set environment variables:

```bash
export AIRSHIP_ADMIN_SECRET="airship_xxx..."
export AIRSHIP_SERVER_URL="http://<your-server>"
```

## 2) Build Bundle

```bash
npx expo export --platform ios --output-dir dist
```

## 3) Publish to Staging

```bash
./scripts/publish-update.sh \
  --app-key my-app \
  --runtime-version 1.0.0 \
  --platform ios \
  --bundle ./dist/bundles/ios-xxxxx.js
```

## 4) Promote to Production

1. Open update detail page in Dashboard.
2. In **Promote**, choose `staging -> production`.
3. Keep rollout `100%` and click **Promote**.

## 5) Quick Validation

```bash
curl -i -X POST "$AIRSHIP_SERVER_URL/api/apps/my-app/manifest" \
  -H "expo-platform: ios" \
  -H "expo-runtime-version: 1.0.0" \
  -H "expo-channel-name: production"
```

Expected: `HTTP 200` multipart response.

## Common Errors

- `401 Unauthorized`: token invalid or missing.
- `App not found`: wrong `--app-key`.
- `no such table: api_tokens`: migration not applied on server.

## Next

- Automation: `docs/ota-publish-guide.md`
- Staging validation: `docs/staging-cross-platform-checklist.md`
- Production ops: `docs/production-operations-checklist.md`
