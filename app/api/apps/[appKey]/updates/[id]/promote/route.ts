import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, updates, channelAssignments } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { promoteUpdateSchema } from "@/shared/validation/updates";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string; id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey, id: updateId } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) {
    return errorResponse(404, "NOT_FOUND", "App not found");
  }

  const update = db
    .select()
    .from(updates)
    .where(and(eq(updates.id, updateId), eq(updates.appId, app.id)))
    .get();

  if (!update) {
    return errorResponse(404, "NOT_FOUND", "Update not found");
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = promoteUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }
  const { fromChannel, toChannel, rolloutPercent } = parsed.data;

  // Verify fromChannel assignment
  const fromCh = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, fromChannel)))
    .get();

  if (!fromCh) {
    return errorResponse(404, "NOT_FOUND", `Channel '${fromChannel}' not found`);
  }

  const fromAssignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, fromCh.id),
        eq(channelAssignments.runtimeVersion, update.runtimeVersion),
        eq(channelAssignments.platform, update.platform),
        eq(channelAssignments.updateId, updateId)
      )
    )
    .get();

  if (!fromAssignment) {
    return errorResponse(400, "BAD_REQUEST", `Update is not currently assigned to '${fromChannel}' channel`);
  }

  // Get or create toChannel
  const now = Date.now();
  let toCh = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, toChannel)))
    .get();

  if (!toCh) {
    const toChId = uuidv4();
    db.insert(channels)
      .values({
        id: toChId,
        appId: app.id,
        name: toChannel,
        createdAt: now,
      })
      .run();
    toCh = { id: toChId, appId: app.id, name: toChannel, createdAt: now };
  }

  // Upsert channel assignment for toChannel
  const existingAssignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, toCh.id),
        eq(channelAssignments.runtimeVersion, update.runtimeVersion),
        eq(channelAssignments.platform, update.platform)
      )
    )
    .get();

  const percent = rolloutPercent ?? 100;

  if (existingAssignment) {
    db.update(channelAssignments)
      .set({ updateId, rolloutPercent: percent, updatedAt: now })
      .where(eq(channelAssignments.id, existingAssignment.id))
      .run();
  } else {
    db.insert(channelAssignments)
      .values({
        id: uuidv4(),
        appId: app.id,
        channelId: toCh.id,
        updateId,
        runtimeVersion: update.runtimeVersion,
        platform: update.platform,
        rolloutPercent: percent,
        updatedAt: now,
      })
      .run();
  }

  return NextResponse.json({
    promoted: true,
    updateId,
    fromChannel,
    toChannel,
    runtimeVersion: update.runtimeVersion,
    rolloutPercent: percent,
  });
}
