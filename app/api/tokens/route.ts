import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/shared/libs/db";
import { apiTokens } from "@/shared/libs/db/schema";
import { verifyAuth } from "@/shared/libs/auth";
import { invalidRequestFromZod } from "@/shared/libs/http/error";
import { createTokenSchema } from "@/shared/validation/tokens";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const tokens = db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .all();

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const rawBody = await request.json().catch(() => null);
  const parsed = createTokenSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequestFromZod(parsed.error);

  const { name } = parsed.data;

  const plainToken = `airship_${randomBytes(32).toString("hex")}`;
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  const id = uuidv4();
  const now = Date.now();

  db.insert(apiTokens)
    .values({ id, name, tokenHash, createdAt: now })
    .run();

  return NextResponse.json({ id, name, token: plainToken }, { status: 201 });
}
