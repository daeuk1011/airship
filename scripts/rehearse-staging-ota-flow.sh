#!/usr/bin/env bash
set -euo pipefail

required_envs=(
  STAGING_BASE_URL
  STAGING_ADMIN_SECRET
  STAGING_APP_KEY
  STAGING_RUNTIME_VERSION
)

for name in "${required_envs[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "[rehearsal] missing required env: ${name}"
    exit 1
  fi
done

BASE_URL="${STAGING_BASE_URL%/}"
ADMIN_SECRET="${STAGING_ADMIN_SECRET}"
APP_KEY="${STAGING_APP_KEY}"
RUNTIME_VERSION="${STAGING_RUNTIME_VERSION}"
CHANNEL_NAME="${STAGING_CHANNEL_NAME:-staging}"

TMP_DIR="$(mktemp -d /tmp/airship-rehearsal-XXXXXX)"
TMP_BODY="${TMP_DIR}/body.json"
TMP_HEADERS="${TMP_DIR}/headers.txt"
LAUNCH_JS="${TMP_DIR}/index.bundle"
ASSET_FILE="${TMP_DIR}/asset.bin"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo 'console.log("ota rehearsal bundle");' > "${LAUNCH_JS}"
printf 'rehearsal-asset' > "${ASSET_FILE}"

request_json() {
  local method="$1"
  local url="$2"
  local payload="${3:-}"

  if [[ -n "${payload}" ]]; then
    curl -sS -D "${TMP_HEADERS}" -o "${TMP_BODY}" -w "%{http_code}" \
      -X "${method}" "${url}" \
      -H "content-type: application/json" \
      -H "authorization: Bearer ${ADMIN_SECRET}" \
      -d "${payload}"
  else
    curl -sS -D "${TMP_HEADERS}" -o "${TMP_BODY}" -w "%{http_code}" \
      -X "${method}" "${url}" \
      -H "authorization: Bearer ${ADMIN_SECRET}"
  fi
}

assert_status() {
  local status="$1"
  local expected="$2"
  local label="$3"
  if [[ "${status}" != "${expected}" ]]; then
    echo "[rehearsal] ${label} failed: expected ${expected}, got ${status}"
    cat "${TMP_BODY}"
    exit 1
  fi
}

json_get() {
  local expr="$1"
  bun -e "const fs=require('fs'); const v=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const path=process.argv[2].split('.'); let cur=v; for (const p of path){ cur=cur?.[p]; } if (cur===undefined || cur===null) process.exit(2); if (typeof cur==='string') process.stdout.write(cur); else process.stdout.write(JSON.stringify(cur));" "${TMP_BODY}" "${expr}"
}

echo "[rehearsal] ensure app exists: ${APP_KEY}"
status="$(request_json "POST" "${BASE_URL}/api/apps" "{\"appKey\":\"${APP_KEY}\",\"name\":\"${APP_KEY}\"}")"
if [[ "${status}" != "201" && "${status}" != "409" ]]; then
  echo "[rehearsal] app create failed with unexpected status ${status}"
  cat "${TMP_BODY}"
  exit 1
fi

for platform in ios android; do
  echo "[rehearsal] ${platform}: presign upload URLs"
  status="$(request_json "POST" "${BASE_URL}/api/apps/${APP_KEY}/uploads/presign" "{\"runtimeVersion\":\"${RUNTIME_VERSION}\",\"platform\":\"${platform}\",\"bundleFilename\":\"index.bundle\",\"assets\":[{\"filename\":\"asset-${platform}.bin\",\"contentType\":\"application/octet-stream\"}]}")"
  assert_status "${status}" "200" "${platform} presign"

  bundle_url="$(json_get "bundle.presignedUrl")"
  bundle_s3_key="$(json_get "bundle.s3Key")"
  asset_url="$(json_get "assets.0.presignedUrl")"
  asset_s3_key="$(json_get "assets.0.s3Key")"
  update_group_id="$(json_get "updateGroupId")"

  echo "[rehearsal] ${platform}: upload bundle/asset to presigned URLs"
  curl -sS -o /dev/null -X PUT -H "content-type: application/javascript" --data-binary @"${LAUNCH_JS}" "${bundle_url}"
  curl -sS -o /dev/null -X PUT -H "content-type: application/octet-stream" --data-binary @"${ASSET_FILE}" "${asset_url}"

  echo "[rehearsal] ${platform}: commit update"
  status="$(request_json "POST" "${BASE_URL}/api/apps/${APP_KEY}/uploads/commit" "{\"updateGroupId\":\"${update_group_id}\",\"runtimeVersion\":\"${RUNTIME_VERSION}\",\"platform\":\"${platform}\",\"channelName\":\"${CHANNEL_NAME}\",\"bundle\":{\"s3Key\":\"${bundle_s3_key}\",\"hash\":\"hash-${platform}\",\"size\":36},\"assets\":[{\"s3Key\":\"${asset_s3_key}\",\"hash\":\"asset-hash-${platform}\",\"key\":\"asset-${platform}\",\"fileExtension\":\"bin\",\"contentType\":\"application/octet-stream\",\"size\":15}]}")"
  assert_status "${status}" "201" "${platform} commit"

  echo "[rehearsal] ${platform}: manifest fetch"
  status="$(curl -sS -o "${TMP_BODY}" -w "%{http_code}" \
    -X POST "${BASE_URL}/api/apps/${APP_KEY}/manifest" \
    -H "expo-platform: ${platform}" \
    -H "expo-runtime-version: ${RUNTIME_VERSION}" \
    -H "expo-channel-name: ${CHANNEL_NAME}")"
  assert_status "${status}" "200" "${platform} manifest"
done

echo "[rehearsal] success: iOS and Android OTA flow validated on ${BASE_URL}"
