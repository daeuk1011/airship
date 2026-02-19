#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${INTEGRATION_TEST_PORT:-4010}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
ADMIN_SECRET_VALUE="integration-secret"
TMP_NEXT_DIST=".next-integration-${PORT}-$$"
TMP_DB="$(mktemp /tmp/airship-integration-XXXXXX.db)"
MIGRATE_LOG="$(mktemp /tmp/airship-migrate-XXXXXX.log)"
SERVER_LOG="$(mktemp /tmp/airship-server-XXXXXX.log)"
TMP_HEADERS="$(mktemp /tmp/airship-headers-XXXXXX.txt)"
TMP_BODY="$(mktemp /tmp/airship-body-XXXXXX.json)"
TS_CONFIG_BACKUP="$(mktemp /tmp/airship-tsconfig-backup-XXXXXX.json)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ -f "${TS_CONFIG_BACKUP}" ]]; then
    cp "${TS_CONFIG_BACKUP}" "${ROOT_DIR}/tsconfig.json"
  fi
  rm -rf "${ROOT_DIR}/${TMP_NEXT_DIST}"
  rm -f "${TMP_DB}" "${MIGRATE_LOG}" "${SERVER_LOG}" "${TMP_HEADERS}" "${TMP_BODY}" "${TS_CONFIG_BACKUP}"
}
trap cleanup EXIT

cd "${ROOT_DIR}"
cp "${ROOT_DIR}/tsconfig.json" "${TS_CONFIG_BACKUP}"

export DATABASE_URL="file:${TMP_DB}"
export ADMIN_SECRET="${ADMIN_SECRET_VALUE}"
export NEXT_DIST_DIR="${TMP_NEXT_DIST}"

echo "[integration] applying migrations"
bun run db:migrate >"${MIGRATE_LOG}" 2>&1

echo "[integration] starting next dev server on ${BASE_URL}"
bun run dev -- --port "${PORT}" >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

for _ in {1..60}; do
  if curl -sS "${BASE_URL}/dashboard/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sS "${BASE_URL}/dashboard/login" >/dev/null 2>&1; then
  echo "[integration] server did not become ready"
  cat "${SERVER_LOG}"
  exit 1
fi

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "[integration] ${label} failed: expected ${expected}, got ${actual}"
    cat "${TMP_BODY}"
    exit 1
  fi
}

assert_body_contains() {
  local needle="$1"
  local label="$2"
  if ! grep -q "${needle}" "${TMP_BODY}"; then
    echo "[integration] ${label} failed: response missing '${needle}'"
    cat "${TMP_BODY}"
    exit 1
  fi
}

echo "[integration] POST /api/auth/login invalid body -> 400"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "content-type: application/json" \
  -d '{"password":""}')"
assert_status "${STATUS}" "400" "login invalid body"
assert_body_contains "Invalid request body" "login invalid body"

echo "[integration] POST /api/auth/login success -> 200 + session cookie"
STATUS="$(curl -sS -D "${TMP_HEADERS}" -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "content-type: application/json" \
  -d "{\"password\":\"${ADMIN_SECRET_VALUE}\"}")"
assert_status "${STATUS}" "200" "login success"
if ! grep -qi "set-cookie: airship_session=" "${TMP_HEADERS}"; then
  echo "[integration] login success failed: session cookie missing"
  cat "${TMP_HEADERS}"
  exit 1
fi

echo "[integration] POST /api/apps unauthorized -> 401"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps" \
  -H "content-type: application/json" \
  -d '{"appKey":"my-app","name":"My App"}')"
assert_status "${STATUS}" "401" "apps unauthorized"

echo "[integration] POST /api/apps invalid body -> 400"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"appKey":"Invalid Key","name":""}')"
assert_status "${STATUS}" "400" "apps invalid body"
assert_body_contains "Invalid request body" "apps invalid body"

echo "[integration] POST /api/apps success -> 201"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"appKey":"my-app","name":"My App"}')"
assert_status "${STATUS}" "201" "apps success"

echo "[integration] POST /api/apps duplicate -> 409"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"appKey":"my-app","name":"My App 2"}')"
assert_status "${STATUS}" "409" "apps duplicate"

echo "[integration] GET /api/apps -> contains created app"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X GET "${BASE_URL}/api/apps" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}")"
assert_status "${STATUS}" "200" "apps list"
assert_body_contains "\"appKey\":\"my-app\"" "apps list"

echo "[integration] POST /api/apps/my-app/uploads/preflight unauthorized -> 401"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps/my-app/uploads/preflight" \
  -H "content-type: application/json" \
  -d '{"platform":"ios"}')"
assert_status "${STATUS}" "401" "preflight unauthorized"

echo "[integration] POST /api/apps/my-app/uploads/preflight invalid body -> 400"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps/my-app/uploads/preflight" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"platform":"web"}')"
assert_status "${STATUS}" "400" "preflight invalid body"
assert_body_contains "Invalid request body" "preflight invalid body"

echo "[integration] POST /api/apps/my-app/uploads/preflight suggestion -> 200"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps/my-app/uploads/preflight" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"platform":"ios"}')"
assert_status "${STATUS}" "200" "preflight suggestion"
assert_body_contains "\"ok\":true" "preflight suggestion"
assert_body_contains "\"channelName\":\"staging\"" "preflight suggestion channel"

echo "[integration] POST /api/apps/my-app/uploads/preflight strict checks -> ok:false"
STATUS="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
  -X POST "${BASE_URL}/api/apps/my-app/uploads/preflight" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${ADMIN_SECRET_VALUE}" \
  -d '{"platform":"ios","runtimeVersion":"1.0.0","bundleFilename":"ios.js","bundleSize":0}')"
assert_status "${STATUS}" "200" "preflight strict checks"
assert_body_contains "\"ok\":false" "preflight strict checks"
assert_body_contains "Channel is required" "preflight strict checks"

echo "[integration] all checks passed"
