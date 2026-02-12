import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, updates, assets, channelAssignments } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { headObject } from "@/shared/libs/s3";
import { commitUploadSchema } from "@/shared/validation/uploads";
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
    return errorResponse(404, "NOT_FOUND", "App not found");
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = commitUploadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }

  const {
    updateGroupId,
    runtimeVersion,
    platform,
    channelName,
    bundle,
    assets: assetList,
  } = parsed.data;

  // Verify bundle exists on S3
  const bundleExists = await headObject(bundle.s3Key);
  if (!bundleExists) {
    return errorResponse(400, "BAD_REQUEST", `Bundle not found on S3: ${bundle.s3Key}`);
  }

  // Verify assets exist on S3
  for (const asset of assetList ?? []) {
    const exists = await headObject(asset.s3Key);
    if (!exists) {
      return errorResponse(400, "BAD_REQUEST", `Asset not found on S3: ${asset.s3Key}`);
    }
  }

  const now = Date.now();
  const updateId = uuidv4();

  const targetChannelName = channelName ?? "staging";
  db.transaction((tx) => {
    tx.insert(updates)
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

    for (const asset of assetList ?? []) {
      tx.insert(assets)
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

    let channel = tx
      .select()
      .from(channels)
      .where(and(eq(channels.appId, app.id), eq(channels.name, targetChannelName)))
      .get();

    if (!channel) {
      const channelId = uuidv4();
      try {
        tx.insert(channels)
          .values({
            id: channelId,
            appId: app.id,
            name: targetChannelName,
            createdAt: now,
          })
          .run();
        channel = { id: channelId, appId: app.id, name: targetChannelName, createdAt: now };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        if (!message.includes("UNIQUE")) {
          throw e;
        }
        channel = tx
          .select()
          .from(channels)
          .where(and(eq(channels.appId, app.id), eq(channels.name, targetChannelName)))
          .get();
        if (!channel) {
          throw e;
        }
      }
    }

    const existingAssignment = tx
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

    if (existingAssignment) {
      tx.update(channelAssignments)
        .set({ updateId, updatedAt: now })
        .where(eq(channelAssignments.id, existingAssignment.id))
        .run();
    } else {
      tx.insert(channelAssignments)
        .values({
          id: uuidv4(),
          appId: app.id,
          channelId: channel.id,
          updateId,
          runtimeVersion,
          platform,
          updatedAt: now,
        })
        .run();
    }
  });

  return NextResponse.json({ updateId, updateGroupId }, { status: 201 });
}
