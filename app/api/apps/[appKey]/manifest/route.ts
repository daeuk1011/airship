import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, channelAssignments, updates, assets } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { getPresignedDownloadUrl } from "@/shared/libs/s3";
import crypto from "crypto";

function hashClientId(clientId: string, rolloutPercent: number): boolean {
  const hash = crypto.createHash("sha256").update(clientId).digest();
  const value = hash.readUInt16BE(0) % 100;
  return value < rolloutPercent;
}

export async function POST(
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const platform = request.headers.get("expo-platform");
  const runtimeVersion = request.headers.get("expo-runtime-version");
  const channelName = request.headers.get("expo-channel-name") ?? "production";

  if (!platform) {
    return NextResponse.json(
      { error: "Missing expo-platform header" },
      { status: 400 }
    );
  }

  if (!runtimeVersion) {
    return NextResponse.json(
      { error: "Missing expo-runtime-version header" },
      { status: 400 }
    );
  }

  const channel = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, channelName)))
    .get();

  if (!channel) {
    return new NextResponse(null, {
      status: 204,
      headers: { "expo-protocol-version": "1" },
    });
  }

  const assignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, channel.id),
        eq(channelAssignments.runtimeVersion, runtimeVersion)
      )
    )
    .get();

  if (!assignment) {
    return new NextResponse(null, {
      status: 204,
      headers: { "expo-protocol-version": "1" },
    });
  }

  // Rollout percentage check
  if (assignment.rolloutPercent < 100) {
    const clientId =
      request.headers.get("expo-current-update-id") ??
      request.headers.get("eas-client-id") ??
      "anonymous";
    if (!hashClientId(clientId, assignment.rolloutPercent)) {
      return new NextResponse(null, {
        status: 204,
        headers: { "expo-protocol-version": "1" },
      });
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
    return new NextResponse(null, {
      status: 204,
      headers: { "expo-protocol-version": "1" },
    });
  }

  const updateAssets = db
    .select()
    .from(assets)
    .where(eq(assets.updateId, update.id))
    .all();

  // Generate presigned URLs
  const bundleUrl = await getPresignedDownloadUrl(update.bundleS3Key);

  const manifestAssets = await Promise.all(
    updateAssets.map(async (asset) => ({
      hash: asset.hash,
      key: asset.key,
      fileExtension: asset.fileExtension,
      contentType: asset.contentType ?? "application/octet-stream",
      url: await getPresignedDownloadUrl(asset.s3Key),
    }))
  );

  const manifest = {
    id: update.id,
    createdAt: new Date(update.createdAt).toISOString(),
    runtimeVersion: update.runtimeVersion,
    launchAsset: {
      hash: update.bundleHash,
      key: "bundle",
      fileExtension: ".bundle",
      contentType: "application/javascript",
      url: bundleUrl,
    },
    assets: manifestAssets,
    metadata: {
      branchName: channelName,
    },
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
    },
  });
}
