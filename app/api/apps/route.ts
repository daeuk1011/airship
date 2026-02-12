import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apps, channels } from "@/lib/db/schema";
import { verifyAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const appList = db.select().from(apps).all();
  return NextResponse.json({ apps: appList });
}

export async function POST(request: NextRequest) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { appKey, name } = body;

  if (!appKey || !name) {
    return NextResponse.json(
      { error: "Missing required fields: appKey, name" },
      { status: 400 }
    );
  }

  const now = Date.now();
  const id = uuidv4();

  try {
    db.insert(apps).values({ id, appKey, name, createdAt: now }).run();

    // Create default channels
    for (const channelName of ["production", "staging"]) {
      db.insert(channels)
        .values({
          id: uuidv4(),
          appId: id,
          name: channelName,
          createdAt: now,
        })
        .run();
    }

    return NextResponse.json({ id, appKey, name }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: `App with key '${appKey}' already exists` },
        { status: 409 }
      );
    }
    throw e;
  }
}
