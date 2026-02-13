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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) return errorResponse(404, "NOT_FOUND", "App not found");

  db.transaction((tx) => {
    // Delete rollback history
    tx.delete(rollbackHistory)
      .where(eq(rollbackHistory.appId, app.id))
      .run();

    // Delete channel assignments
    tx.delete(channelAssignments)
      .where(eq(channelAssignments.appId, app.id))
      .run();

    // Delete channels
    tx.delete(channels).where(eq(channels.appId, app.id)).run();

    // Delete assets for each update
    const appUpdates = tx
      .select({ id: updates.id })
      .from(updates)
      .where(eq(updates.appId, app.id))
      .all();
    for (const u of appUpdates) {
      tx.delete(assets).where(eq(assets.updateId, u.id)).run();
    }

    // Delete updates
    tx.delete(updates).where(eq(updates.appId, app.id)).run();

    // Delete app
    tx.delete(apps).where(eq(apps.id, app.id)).run();
  });

  return NextResponse.json({ deleted: true });
}
