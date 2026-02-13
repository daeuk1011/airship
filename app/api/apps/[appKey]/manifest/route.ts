import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, channelAssignments, updates, assets } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { errorResponse } from "@/shared/libs/http/error";
import { getPresignedDownloadUrl } from "@/shared/libs/s3";
import crypto from "crypto";

const SHA256_HEX_PATTERN = /^[a-fA-F0-9]{64}$/;

function hexToBase64Url(hex: string): string | null {
  if (!SHA256_HEX_PATTERN.test(hex)) {
    return null;
  }
  const buf = Buffer.from(hex, "hex");
  return buf.toString("base64url");
}

function hashClientId(clientId: string, rolloutPercent: number): boolean {
  const hash = crypto.createHash("sha256").update(clientId).digest();
  const value = hash.readUInt16BE(0) % 100;
  return value < rolloutPercent;
}

const MULTIPART_HEADERS = {
  "expo-protocol-version": "1",
  "expo-sfv-version": "0",
  "cache-control": "private, max-age=0",
};

function buildMultipartResponse(parts: { name: string; body: string; contentType?: string }[]): NextResponse {
  const boundary = crypto.randomUUID();

  const encoded = parts.map(
    (p) =>
      [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${p.name}"`,
        `Content-Type: ${p.contentType ?? "application/json"}`,
        "",
        p.body,
      ].join("\r\n")
  );

  const body = encoded.join("\r\n") + `\r\n--${boundary}--\r\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      ...MULTIPART_HEADERS,
      "content-type": `multipart/mixed; boundary=${boundary}`,
    },
  });
}

function noUpdateAvailableResponse(): NextResponse {
  return buildMultipartResponse([
    { name: "directive", body: JSON.stringify({ type: "noUpdateAvailable" }) },
  ]);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ appKey: string }> }
) {
  return handleManifest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ appKey: string }> }
) {
  return handleManifest(request, context);
}

async function handleManifest(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string }> }
) {
  const { appKey } = await params;

  const app = db
    .select()
    .from(apps)
    .where(eq(apps.appKey, appKey))
    .get();

  if (!app) {
    return errorResponse(404, "NOT_FOUND", "App not found");
  }

  const platform = request.headers.get("expo-platform");
  const runtimeVersion = request.headers.get("expo-runtime-version");
  const channelName = request.headers.get("expo-channel-name") ?? "production";

  if (!platform) {
    return errorResponse(400, "BAD_REQUEST", "Missing expo-platform header");
  }

  if (!runtimeVersion) {
    return errorResponse(400, "BAD_REQUEST", "Missing expo-runtime-version header");
  }

  const channel = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, channelName)))
    .get();

  if (!channel) {
    return noUpdateAvailableResponse();
  }

  const assignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, channel.id),
        eq(channelAssignments.runtimeVersion, runtimeVersion),
        eq(channelAssignments.platform, platform)
      )
    )
    .get();

  if (!assignment) {
    return noUpdateAvailableResponse();
  }

  // Rollout percentage check
  if (assignment.rolloutPercent < 100) {
    const clientId =
      request.headers.get("expo-current-update-id") ??
      request.headers.get("eas-client-id");
    if (!clientId) {
      return noUpdateAvailableResponse();
    }
    if (!hashClientId(clientId, assignment.rolloutPercent)) {
      return noUpdateAvailableResponse();
    }
  }

  const update = db
    .select()
    .from(updates)
    .where(
      and(
        eq(updates.id, assignment.updateId),
        eq(updates.platform, platform),
        eq(updates.enabled, 1)
      )
    )
    .get();

  if (!update) {
    return noUpdateAvailableResponse();
  }

  // Client already has this update — skip sending full manifest
  const currentUpdateId = request.headers.get("expo-current-update-id");
  if (currentUpdateId === update.id) {
    return noUpdateAvailableResponse();
  }

  const updateAssets = db
    .select()
    .from(assets)
    .where(eq(assets.updateId, update.id))
    .all();

  // Generate presigned URLs
  const bundleUrl = await getPresignedDownloadUrl(update.bundleS3Key);
  const launchAssetHash = hexToBase64Url(update.bundleHash);
  if (!launchAssetHash) {
    return noUpdateAvailableResponse();
  }

  const manifestAssets = await Promise.all(
    updateAssets.map(async (asset) => {
      const hash = hexToBase64Url(asset.hash);
      if (!hash) {
        return null;
      }

      return {
        hash,
        key: asset.key,
        fileExtension: asset.fileExtension,
        contentType: asset.contentType ?? "application/octet-stream",
        url: await getPresignedDownloadUrl(asset.s3Key),
      };
    })
  );
  const normalizedManifestAssets = manifestAssets.filter(
    (asset): asset is NonNullable<typeof asset> => asset !== null
  );
  if (normalizedManifestAssets.length !== updateAssets.length) {
    return noUpdateAvailableResponse();
  }

  const manifest = {
    id: update.id,
    createdAt: new Date(update.createdAt).toISOString(),
    runtimeVersion: update.runtimeVersion,
    launchAsset: {
      hash: launchAssetHash,
      key: update.bundleHash,
      fileExtension: ".bundle",
      contentType: "application/javascript",
      url: bundleUrl,
    },
    assets: normalizedManifestAssets,
    metadata: {
      branchName: channelName,
    },
    extra: {
      expoClient: {
        name: app.appKey,
        slug: app.appKey,
        runtimeVersion: update.runtimeVersion,
      },
    },
  };

  return buildMultipartResponse([
    { name: "manifest", body: JSON.stringify(manifest), contentType: "application/json; charset=utf-8" },
    { name: "extensions", body: JSON.stringify({ assetRequestHeaders: {} }) },
  ]);
}
