import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps, channels, channelAssignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function GET(
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

  const channelList = db
    .select()
    .from(channels)
    .where(eq(channels.appId, app.id))
    .all();

  const enriched = channelList.map((ch) => {
    const assignments = db
      .select()
      .from(channelAssignments)
      .where(eq(channelAssignments.channelId, ch.id))
      .all();

    return {
      ...ch,
      assignments: assignments.map((a) => ({
        runtimeVersion: a.runtimeVersion,
        updateId: a.updateId,
        rolloutPercent: a.rolloutPercent,
        updatedAt: a.updatedAt,
      })),
    };
  });

  return NextResponse.json({ channels: enriched });
}
