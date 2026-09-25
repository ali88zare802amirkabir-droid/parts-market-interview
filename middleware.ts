import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_API = new Set(["/api/auth/login", "/api/health"]);
const ASSET_MARKERS = ["/_next/", "/favicon", "/icon", "/public/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ASSET_MARKERS.some((m) => pathname.startsWith(m))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_API.has(pathname)) {
    // Already authenticated users skip the login page.
    if (pathname === "/login" && token && (await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const session = await verifySessionToken(token);
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { ok: false, error: "احراز هویت انجام نشده است. لطفاً وارد شوید." },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};