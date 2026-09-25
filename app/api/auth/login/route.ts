import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  cookieOptions,
} from "@/lib/auth";
import { verifyPassword, hashPassword, DEFAULT_PASSWORD, DEFAULT_USERNAME } from "@/lib/password";
import { loginSchema } from "@/lib/validate";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("درخواست نامعتبر است.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ورودی نامعتبر است.";
    return jsonError(message, 422);
  }

  const { username, password } = parsed.data;
  const isProd = process.env.NODE_ENV === "production";

  const expectedUser = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  // Dev fallback with a well-known password, only outside production.
  const hashToCheck = expectedHash ?? (isProd ? null : hashPassword(DEFAULT_PASSWORD));
  if (!hashToCheck) {
    return jsonError("رمز عبور ادمین در سرور پیکربندی نشده است.", 500);
  }

  const usernameOk = username === expectedUser;
  const passwordOk = verifyPassword(password, hashToCheck);

  if (!usernameOk || !passwordOk) {
    return jsonError("نام کاربری یا رمز عبور اشتباه است.", 401);
  }

  const token = await signSessionToken(username);
  const response = NextResponse.json({ ok: true, data: { username } });
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return response;
}

export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return jsonError("احراز هویت نشده است.", 401);
  return NextResponse.json({ ok: true, data: { username: session.sub, role: session.role } });
}