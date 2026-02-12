import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, updates, assets, channelAssignments } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { headObject } from "@/shared/libs/s3";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    updateGroupId,
    runtimeVersion,
    platform,
    channelName,
    bundle,
    assets: assetList,
  } = body;

  if (!updateGroupId || !runtimeVersion || !platform || !bundle) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify bundle exists on S3
  const bundleExists = await headObject(bundle.s3Key);
  if (!bundleExists) {
    return NextResponse.json(
      { error: `Bundle not found on S3: ${bundle.s3Key}` },
      { status: 400 }
    );
  }

  // Verify assets exist on S3
  for (const asset of assetList ?? []) {
    const exists = await headObject(asset.s3Key);
    if (!exists) {
      return NextResponse.json(
        { error: `Asset not found on S3: ${asset.s3Key}` },
        { status: 400 }
      );
    }
  }

  const now = Date.now();
  const updateId = uuidv4();

  // Insert update record
  db.insert(updates)
    .values({
      id: updateId,
      appId: app.id,
      updateGroupId,
      runtimeVersion,
      platform,
      bundleS3Key: bundle.s3Key,
      bundleHash: bundle.hash,
      bundleSize: bundle.size ?? null,
      createdAt: now,
    })
    .run();

  // Insert asset records
  for (const asset of assetList ?? []) {
    db.insert(assets)
      .values({
        id: uuidv4(),
        updateId,
        s3Key: asset.s3Key,
        hash: asset.hash,
        key: asset.key,
        fileExtension: asset.fileExtension,
        contentType: asset.contentType ?? null,
        size: asset.size ?? null,
      })
      .run();
  }

  // Upsert channel assignment
  const targetChannelName = channelName ?? "staging";

  let channel = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, targetChannelName)))
    .get();

  if (!channel) {
    const channelId = uuidv4();
    db.insert(channels)
      .values({
        id: channelId,
        appId: app.id,
        name: targetChannelName,
        createdAt: now,
      })
      .run();
    channel = { id: channelId, appId: app.id, name: targetChannelName, createdAt: now };
  }

  // Check for existing assignment
  const existingAssignment = db
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

  if (existingAssignment) {
    db.update(channelAssignments)
      .set({ updateId, updatedAt: now })
      .where(eq(channelAssignments.id, existingAssignment.id))
      .run();
  } else {
    db.insert(channelAssignments)
      .values({
        id: uuidv4(),
        appId: app.id,
        channelId: channel.id,
        updateId,
        runtimeVersion,
        updatedAt: now,
      })
      .run();
  }

  return NextResponse.json({ updateId, updateGroupId }, { status: 201 });
}
