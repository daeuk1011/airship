import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, updates, channelAssignments, rollbackHistory } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string; id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey, id: targetUpdateId } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const targetUpdate = db
    .select()
    .from(updates)
    .where(and(eq(updates.id, targetUpdateId), eq(updates.appId, app.id)))
    .get();

  if (!targetUpdate) {
    return NextResponse.json({ error: "Target update not found" }, { status: 404 });
  }

  const body = await request.json();
  const { channelName, reason } = body;

  if (!channelName) {
    return NextResponse.json(
      { error: "Missing required field: channelName" },
      { status: 400 }
    );
  }

  const channel = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, channelName)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const assignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, channel.id),
        eq(channelAssignments.runtimeVersion, targetUpdate.runtimeVersion)
      )
    )
    .get();

  if (!assignment) {
    return NextResponse.json(
      { error: "No channel assignment found for this runtime version" },
      { status: 404 }
    );
  }

  const fromUpdateId = assignment.updateId;
  const now = Date.now();

  // Update channel assignment pointer
  db.update(channelAssignments)
    .set({ updateId: targetUpdateId, updatedAt: now })
    .where(eq(channelAssignments.id, assignment.id))
    .run();

  // Record rollback history
  db.insert(rollbackHistory)
    .values({
      id: uuidv4(),
      appId: app.id,
      channelId: channel.id,
      fromUpdateId,
      toUpdateId: targetUpdateId,
      reason: reason ?? null,
      createdAt: now,
    })
    .run();

  return NextResponse.json({
    rolledBack: true,
    fromUpdateId,
    toUpdateId: targetUpdateId,
    channelName,
    runtimeVersion: targetUpdate.runtimeVersion,
  });
}
