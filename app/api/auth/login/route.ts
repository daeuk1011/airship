import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { loginSchema } from "@/shared/validation/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }
  const { password } = parsed.data;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || password !== secret) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid password");
  }

  const token = createSessionToken(secret);
  const response = NextResponse.json({ ok: true });

  response.cookies.set("airship_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
