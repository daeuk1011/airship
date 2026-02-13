#!/usr/bin/env bash
set -euo pipefail

# OTA Update Publisher
# Presign → S3 Upload → Commit in one command.
# Dependencies: curl, jq, shasum

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Publish an OTA update to Airship server.

Required:
  --server URL          Airship server URL (or set AIRSHIP_SERVER_URL)
  --app-key KEY         App key
  --runtime-version VER Runtime version (e.g. 1.0.0)
  --platform PLATFORM   Platform (ios or android)
  --bundle PATH         Path to the bundle file

Optional:
  --channel NAME        Channel name (default: staging)
  --help                Show this help

Environment:
  AIRSHIP_ADMIN_SECRET  Bearer token for authentication (required)
  AIRSHIP_SERVER_URL    Server URL (can be overridden by --server)

Examples:
  $(basename "$0") \\
    --server https://ota.example.com \\
    --app-key my-app \\
    --runtime-version 1.0.0 \\
    --platform ios \\
    --bundle ./dist/bundles/ios.js

  AIRSHIP_SERVER_URL=https://ota.example.com $(basename "$0") \\
    --app-key my-app \\
    --runtime-version 1.0.0 \\
    --platform ios \\
    --bundle ./dist/bundles/ios.js \\
    --channel production
EOF
  exit 0
}

# Defaults
SERVER="${AIRSHIP_SERVER_URL:-}"
APP_KEY=""
RUNTIME_VERSION=""
PLATFORM=""
BUNDLE=""
CHANNEL="staging"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) SERVER="$2"; shift 2 ;;
    --app-key) APP_KEY="$2"; shift 2 ;;
    --runtime-version) RUNTIME_VERSION="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    --bundle) BUNDLE="$2"; shift 2 ;;
    --channel) CHANNEL="$2"; shift 2 ;;
    --help) usage ;;
    *) echo "Error: Unknown option $1"; exit 1 ;;
  esac
done

# Validate required params
missing=()
[[ -z "$SERVER" ]] && missing+=("--server (or AIRSHIP_SERVER_URL)")
[[ -z "$APP_KEY" ]] && missing+=("--app-key")
[[ -z "$RUNTIME_VERSION" ]] && missing+=("--runtime-version")
[[ -z "$PLATFORM" ]] && missing+=("--platform")
[[ -z "$BUNDLE" ]] && missing+=("--bundle")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Error: Missing required parameters:"
  for m in "${missing[@]}"; do echo "  $m"; done
  echo ""
  echo "Run with --help for usage."
  exit 1
fi

if [[ -z "${AIRSHIP_ADMIN_SECRET:-}" ]]; then
  echo "Error: AIRSHIP_ADMIN_SECRET environment variable is required"
  exit 1
fi

if [[ ! -f "$BUNDLE" ]]; then
  echo "Error: Bundle file not found: $BUNDLE"
  exit 1
fi

# Check dependencies
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: Required command not found: $cmd"
    exit 1
  fi
done

AUTH_HEADER="Authorization: Bearer ${AIRSHIP_ADMIN_SECRET}"
BUNDLE_FILENAME=$(basename "$BUNDLE")
BUNDLE_SIZE=$(wc -c < "$BUNDLE" | tr -d ' ')

# Compute SHA-256 hash
if command -v shasum &>/dev/null; then
  BUNDLE_HASH=$(shasum -a 256 "$BUNDLE" | cut -d' ' -f1)
elif command -v sha256sum &>/dev/null; then
  BUNDLE_HASH=$(sha256sum "$BUNDLE" | cut -d' ' -f1)
else
  echo "Error: Neither shasum nor sha256sum found"
  exit 1
fi

echo "==> Publishing OTA update"
echo "    Server:   $SERVER"
echo "    App:      $APP_KEY"
echo "    Runtime:  $RUNTIME_VERSION"
echo "    Platform: $PLATFORM"
echo "    Channel:  $CHANNEL"
echo "    Bundle:   $BUNDLE_FILENAME ($BUNDLE_SIZE bytes)"
echo "    Hash:     $BUNDLE_HASH"
echo ""

# Step 1: Presign
echo "==> Step 1/3: Requesting presigned upload URL..."
PRESIGN_RESPONSE=$(curl -sf \
  -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg rv "$RUNTIME_VERSION" \
    --arg p "$PLATFORM" \
    --arg bf "$BUNDLE_FILENAME" \
    '{runtimeVersion: $rv, platform: $p, bundleFilename: $bf, assets: []}'
  )" \
  "${SERVER}/api/apps/${APP_KEY}/uploads/presign") || {
  echo "Error: Presign request failed"
  exit 1
}

UPDATE_GROUP_ID=$(echo "$PRESIGN_RESPONSE" | jq -r '.updateGroupId')
PRESIGNED_URL=$(echo "$PRESIGN_RESPONSE" | jq -r '.bundle.presignedUrl')
BUNDLE_S3_KEY=$(echo "$PRESIGN_RESPONSE" | jq -r '.bundle.s3Key')

if [[ -z "$UPDATE_GROUP_ID" || "$UPDATE_GROUP_ID" == "null" ]]; then
  echo "Error: Invalid presign response"
  echo "$PRESIGN_RESPONSE" | jq .
  exit 1
fi

echo "    Update Group ID: $UPDATE_GROUP_ID"
echo "    S3 Key: $BUNDLE_S3_KEY"

# Step 2: Upload to S3
echo "==> Step 2/3: Uploading bundle to S3..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PUT \
  -H "Content-Type: application/javascript" \
  --data-binary "@${BUNDLE}" \
  "$PRESIGNED_URL") || {
  echo "Error: S3 upload failed"
  exit 1
}

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "Error: S3 upload returned HTTP $HTTP_STATUS"
  exit 1
fi

echo "    Upload complete (HTTP $HTTP_STATUS)"

# Step 3: Commit
echo "==> Step 3/3: Committing update..."
COMMIT_RESPONSE=$(curl -sf \
  -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg ugid "$UPDATE_GROUP_ID" \
    --arg rv "$RUNTIME_VERSION" \
    --arg p "$PLATFORM" \
    --arg ch "$CHANNEL" \
    --arg s3key "$BUNDLE_S3_KEY" \
    --arg hash "$BUNDLE_HASH" \
    --argjson size "$BUNDLE_SIZE" \
    '{
      updateGroupId: $ugid,
      runtimeVersion: $rv,
      platform: $p,
      channelName: $ch,
      bundle: { s3Key: $s3key, hash: $hash, size: $size },
      assets: []
    }'
  )" \
  "${SERVER}/api/apps/${APP_KEY}/uploads/commit") || {
  echo "Error: Commit request failed"
  exit 1
}

UPDATE_ID=$(echo "$COMMIT_RESPONSE" | jq -r '.updateId')

if [[ -z "$UPDATE_ID" || "$UPDATE_ID" == "null" ]]; then
  echo "Error: Invalid commit response"
  echo "$COMMIT_RESPONSE" | jq .
  exit 1
fi

echo ""
echo "==> Success!"
echo "    Update ID: $UPDATE_ID"
echo "    Channel:   $CHANNEL"
