import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, cookieOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true, data: null });
}