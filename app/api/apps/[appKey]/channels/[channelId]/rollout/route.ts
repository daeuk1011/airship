import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, channelAssignments } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { updateRolloutSchema } from "@/shared/validation/updates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string; channelId: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey, channelId } = await params;

  const rawBody = await request.json().catch(() => null);
  const parsed = updateRolloutSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequestFromZod(parsed.error);

  const { assignmentId, rolloutPercent } = parsed.data;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) return errorResponse(404, "NOT_FOUND", "App not found");

  const channel = db
    .select()
    .from(channels)
    .where(and(eq(channels.id, channelId), eq(channels.appId, app.id)))
    .get();
  if (!channel) return errorResponse(404, "NOT_FOUND", "Channel not found");

  const assignment = db
    .select()
    .from(channelAssignments)
    .where(
      and(
        eq(channelAssignments.id, assignmentId),
        eq(channelAssignments.channelId, channelId)
      )
    )
    .get();
  if (!assignment) return errorResponse(404, "NOT_FOUND", "Assignment not found");

  db.update(channelAssignments)
    .set({ rolloutPercent, updatedAt: Date.now() })
    .where(eq(channelAssignments.id, assignmentId))
    .run();

  return NextResponse.json({ id: assignmentId, rolloutPercent });
}
