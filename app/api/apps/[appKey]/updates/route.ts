import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps, updates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

  const updateList = db
    .select()
    .from(updates)
    .where(eq(updates.appId, app.id))
    .orderBy(desc(updates.createdAt))
    .all();

  return NextResponse.json({ updates: updateList });
}
