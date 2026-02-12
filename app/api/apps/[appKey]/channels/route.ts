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

  const app = db.query.apps.findFirst({
    where: eq(apps.appKey, appKey),
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const channelList = db.query.channels.findMany({
    where: eq(channels.appId, app.id),
  });

  // Enrich with current assignments
  const enriched = channelList.map((ch) => {
    const assignments = db.query.channelAssignments.findMany({
      where: eq(channelAssignments.channelId, ch.id),
    });
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
