import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apiTokens } from "@/shared/libs/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse } from "@/shared/libs/http/error";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const token = db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
    .get();
  if (!token) return errorResponse(404, "NOT_FOUND", "Token not found");

  db.delete(apiTokens).where(eq(apiTokens.id, id)).run();

  return NextResponse.json({ deleted: true });
}
