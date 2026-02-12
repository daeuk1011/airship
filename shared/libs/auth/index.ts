import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
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
    if (secret && token === secret) {
      return null;
    }
  }

  // Check session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken && verifySessionToken(sessionToken)) {
    return null;
  }

  return errorResponse(401, "UNAUTHORIZED", "Unauthorized");
}
