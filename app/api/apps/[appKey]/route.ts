import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import {
  apps,
  updates,
  assets,
  channels,
  channelAssignments,
  rollbackHistory,
} from "@/shared/libs/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse } from "@/shared/libs/http/error";
import { deleteObjects } from "@/shared/libs/s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) return errorResponse(404, "NOT_FOUND", "App not found");

  let deleteS3 = false;
  try {
    const body = await request.json();
    deleteS3 = body.deleteS3 === true;
  } catch {
    // no body or invalid JSON — default to false
  }

  // Collect S3 keys before deleting DB records
  const s3Keys: string[] = [];
  if (deleteS3) {
    const appUpdates = db
      .select({ id: updates.id, bundleS3Key: updates.bundleS3Key })
      .from(updates)
      .where(eq(updates.appId, app.id))
      .all();

    for (const u of appUpdates) {
      s3Keys.push(u.bundleS3Key);
      const updateAssets = db
        .select({ s3Key: assets.s3Key })
        .from(assets)
        .where(eq(assets.updateId, u.id))
        .all();
      for (const a of updateAssets) {
        s3Keys.push(a.s3Key);
      }
    }
  }

  // Delete all DB records in a transaction
  db.transaction((tx) => {
    tx.delete(rollbackHistory)
      .where(eq(rollbackHistory.appId, app.id))
      .run();

    tx.delete(channelAssignments)
      .where(eq(channelAssignments.appId, app.id))
      .run();

    tx.delete(channels).where(eq(channels.appId, app.id)).run();

    const appUpdates = tx
      .select({ id: updates.id })
      .from(updates)
      .where(eq(updates.appId, app.id))
      .all();
    for (const u of appUpdates) {
      tx.delete(assets).where(eq(assets.updateId, u.id)).run();
    }

    tx.delete(updates).where(eq(updates.appId, app.id)).run();
    tx.delete(apps).where(eq(apps.id, app.id)).run();
  });

  // Delete S3 objects after DB transaction succeeds
  if (deleteS3 && s3Keys.length > 0) {
    await deleteObjects(s3Keys);
  }

  return NextResponse.json({ deleted: true });
}
