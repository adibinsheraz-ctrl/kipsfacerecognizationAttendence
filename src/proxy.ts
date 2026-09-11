import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Direct /login alias to /admin/login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 2. CSRF Origin Verification on state-changing API requests
  if (
    request.method === "POST" ||
    request.method === "PATCH" ||
    request.method === "DELETE" ||
    request.method === "PUT"
  ) {
    if (pathname.startsWith("/api/")) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return NextResponse.json(
              { error: "Forbidden: Cross-site request rejected" },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "Forbidden: Invalid origin header" },
            { status: 403 }
          );
        }
      }
    }
  }

  // 3. Admin Authentication Check
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // If already logged in and visiting /admin/login -> redirect to /admin
  if (pathname === "/admin/login") {
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Admin pages protection: /admin/** (excluding /admin/login)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      const res = NextResponse.redirect(loginUrl);
      if (token) {
        // Clear invalid/expired cookie
        res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
      }
      return res;
    }
  }

  // Kiosk page protection: /kiosk requires authenticated session
  if (pathname === "/kiosk" || pathname.startsWith("/kiosk/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Admin API routes protection: return 401 JSON immediately
  const isAdminApi =
    pathname.startsWith("/api/academics") ||
    pathname.startsWith("/api/people") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/stats") ||
    pathname.startsWith("/api/security") ||
    pathname === "/api/attendance" ||
    pathname.startsWith("/api/attendance/export") ||
    pathname.startsWith("/api/attendance/mark");

  if (isAdminApi && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/admin/:path*",
    "/kiosk",
    "/kiosk/:path*",
    "/login",
    "/api/settings",
    "/api/settings/:path*",
    "/api/stats",
    "/api/stats/:path*",
    "/api/people",
    "/api/people/:path*",
    "/api/academics/:path*",
    "/api/attendance",
    "/api/attendance/:path*",
    "/api/security/:path*",
  ],
};
