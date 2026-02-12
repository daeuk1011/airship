import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels } from "@/shared/libs/db/schema";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { createAppSchema } from "@/shared/validation/apps";
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

  const rawBody = await request.json().catch(() => null);
  const parsed = createAppSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }
  const { appKey, name } = parsed.data;

  const now = Date.now();
  const id = uuidv4();

  try {
    db.transaction((tx) => {
      tx.insert(apps).values({ id, appKey, name, createdAt: now }).run();

      // Create default channels
      for (const channelName of ["production", "staging"]) {
        tx.insert(channels)
          .values({
            id: uuidv4(),
            appId: id,
            name: channelName,
            createdAt: now,
          })
          .run();
      }
    });

    return NextResponse.json({ id, appKey, name }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return errorResponse(409, "CONFLICT", `App with key '${appKey}' already exists`);
    }
    throw e;
  }
}
