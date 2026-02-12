# Staging Verification Checklist (iOS/Android Cross-Platform)

## 1) Apply Migration

```bash
bun run db:migrate
```

Expected:
- migration `0001_channel_assignments_platform` applied
- `channel_assignments` table has `platform` column

## 2) Run Integration Tests Locally First

```bash
bun run test:integration
bun run verify:platform
```

Expected:
- API validation tests pass
- migration/platform uniqueness test passes
- local server-based integration checks pass

## 3) Staging Manual Scenario

Use same `appKey`, same `runtimeVersion`, same `channel`, but different `platform`.

1. Upload/commit iOS update to `staging`
2. Upload/commit Android update to `staging`
3. Request manifest with iOS headers
4. Request manifest with Android headers

Example manifest request shape:

```bash
curl -i -X POST "https://<staging-host>/api/apps/<appKey>/manifest" \
  -H "expo-platform: ios" \
  -H "expo-runtime-version: 1.0.0" \
  -H "expo-channel-name: staging"
```

Then repeat with `expo-platform: android`.

Expected:
- iOS request returns iOS launch bundle
- Android request returns Android launch bundle
- one platform deploy must not overwrite the other platform assignment

## 4) Optional DB Sanity Query

Check same `(app_id, channel_id, runtime_version)` has both platforms:

```sql
select app_id, channel_id, runtime_version, platform, update_id
from channel_assignments
where app_id = '<app-id>' and runtime_version = '1.0.0'
order by platform;
```

Expected:
- one row for `ios`
- one row for `android`
