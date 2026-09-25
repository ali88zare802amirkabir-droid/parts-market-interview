import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Guard for route handlers — reads the HttpOnly session cookie, verifies the
 * JWT and returns null when authorized, otherwise a 401 JSON response.
 * Tests can mock `next/headers` / `@/lib/auth` to exercise pass & fail paths.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const token = (await cookies()).get("parts_admin_session")?.value;
  const session = await verifySessionToken(token);
  if (!session) return jsonError("احراز هویت انجام نشده است. لطفاً وارد شوید.", 401);
  return null;
}