import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, updates } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse } from "@/shared/libs/http/error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string; id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey, id } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) return errorResponse(404, "NOT_FOUND", "App not found");

  const update = db
    .select()
    .from(updates)
    .where(and(eq(updates.id, id), eq(updates.appId, app.id)))
    .get();
  if (!update) return errorResponse(404, "NOT_FOUND", "Update not found");

  const newEnabled = update.enabled ? 0 : 1;
  db.update(updates).set({ enabled: newEnabled }).where(eq(updates.id, id)).run();

  return NextResponse.json({
    id: update.id,
    enabled: newEnabled === 1,
  });
}
