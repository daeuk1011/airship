import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function invalidRequestFromZod(error: ZodError) {
  const flattened = error.flatten();
  return errorResponse(400, "INVALID_REQUEST", "Invalid request body", {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  });
}
