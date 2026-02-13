#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DB="$(mktemp /tmp/airship-platform-XXXXXX.db)"
MIGRATE_LOG="$(mktemp /tmp/airship-platform-migrate-XXXXXX.log)"

cleanup() {
  rm -f "${TMP_DB}" "${MIGRATE_LOG}"
}
trap cleanup EXIT

cd "${ROOT_DIR}"
export DATABASE_URL="file:${TMP_DB}"

echo "[verify-platform] applying migrations"
if ! bun run db:migrate >"${MIGRATE_LOG}" 2>&1; then
  echo "[verify-platform] migration failed:"
  cat "${MIGRATE_LOG}"
  exit 1
fi

sqlite3 "${TMP_DB}" <<'SQL'
PRAGMA foreign_keys = ON;
INSERT INTO apps (id, app_key, name, created_at) VALUES ('app-1', 'sample-app', 'Sample App', 1);
INSERT INTO channels (id, app_id, name, created_at) VALUES ('ch-1', 'app-1', 'staging', 1);
INSERT INTO updates (id, app_id, update_group_id, runtime_version, platform, bundle_s3_key, bundle_hash, created_at)
VALUES ('u-ios', 'app-1', 'g-ios', '1.0.0', 'ios', 's3-ios', 'hash-ios', 1);
INSERT INTO updates (id, app_id, update_group_id, runtime_version, platform, bundle_s3_key, bundle_hash, created_at)
VALUES ('u-android', 'app-1', 'g-android', '1.0.0', 'android', 's3-android', 'hash-android', 1);
INSERT INTO channel_assignments (id, app_id, channel_id, update_id, runtime_version, platform, updated_at)
VALUES ('ca-ios', 'app-1', 'ch-1', 'u-ios', '1.0.0', 'ios', 1);
INSERT INTO channel_assignments (id, app_id, channel_id, update_id, runtime_version, platform, updated_at)
VALUES ('ca-android', 'app-1', 'ch-1', 'u-android', '1.0.0', 'android', 1);
SQL

ROW_COUNT="$(sqlite3 "${TMP_DB}" "select count(*) from channel_assignments where app_id='app-1' and channel_id='ch-1' and runtime_version='1.0.0';")"
if [[ "${ROW_COUNT}" != "2" ]]; then
  echo "[verify-platform] expected 2 platform-specific assignments, got ${ROW_COUNT}"
  exit 1
fi

set +e
sqlite3 "${TMP_DB}" \
  "INSERT INTO channel_assignments (id, app_id, channel_id, update_id, runtime_version, platform, updated_at) VALUES ('ca-ios-dup', 'app-1', 'ch-1', 'u-ios', '1.0.0', 'ios', 2);" \
  >/dev/null 2>&1
DUPLICATE_RESULT=$?
set -e

if [[ "${DUPLICATE_RESULT}" -eq 0 ]]; then
  echo "[verify-platform] duplicate same-platform insert unexpectedly succeeded"
  exit 1
fi

echo "[verify-platform] passed: same runtime/channel supports ios+android separately and blocks duplicates"
