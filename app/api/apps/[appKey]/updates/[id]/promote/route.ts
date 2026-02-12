import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps, channels, updates, channelAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const update = db
    .select()
    .from(updates)
    .where(and(eq(updates.id, updateId), eq(updates.appId, app.id)))
    .get();

  if (!update) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  const body = await request.json();
  const { fromChannel, toChannel, rolloutPercent } = body;

  if (!fromChannel || !toChannel) {
    return NextResponse.json(
      { error: "Missing required fields: fromChannel, toChannel" },
      { status: 400 }
    );
  }

  // Verify fromChannel assignment
  const fromCh = db
    .select()
    .from(channels)
    .where(and(eq(channels.appId, app.id), eq(channels.name, fromChannel)))
    .get();

  if (!fromCh) {
    return NextResponse.json(
      { error: `Channel '${fromChannel}' not found` },
      { status: 404 }
    );
  }

  const fromAssignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.appId, app.id),
        eq(channelAssignments.channelId, fromCh.id),
        eq(channelAssignments.runtimeVersion, update.runtimeVersion),
        eq(channelAssignments.updateId, updateId)
      )
    )
    .get();

  if (!fromAssignment) {
    return NextResponse.json(
      { error: `Update is not currently assigned to '${fromChannel}' channel` },
      { status: 400 }
    );
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
        eq(channelAssignments.runtimeVersion, update.runtimeVersion)
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
