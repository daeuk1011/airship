import { NextRequest, NextResponse } from "next/server";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/shared/libs/db";
import { apiTokens } from "@/shared/libs/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "@/shared/libs/http/error";

const SESSION_COOKIE = "airship_session";

export function createSessionToken(secret: string): string {
  return createHmac("sha256", secret).update("airship_session").digest("hex");
}

export function verifySessionToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const expected = createSessionToken(secret);
  if (token.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function verifyAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;

  // Check Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Check admin secret
    if (secret && token === secret) {
      return null;
    }

    // Check API token (airship_ prefix)
    if (token.startsWith("airship_")) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const found = db
        .select({ id: apiTokens.id })
        .from(apiTokens)
        .where(eq(apiTokens.tokenHash, tokenHash))
        .get();
      if (found) {
        db.update(apiTokens)
          .set({ lastUsedAt: Date.now() })
          .where(eq(apiTokens.id, found.id))
          .run();
        return null;
      }
    }
  }

  // Check session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken && verifySessionToken(sessionToken)) {
    return null;
  }

  return errorResponse(401, "UNAUTHORIZED", "Unauthorized");
}
