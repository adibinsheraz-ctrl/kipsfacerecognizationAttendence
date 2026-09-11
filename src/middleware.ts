import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "kips_admin_session";

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "kips-dev-jwt-secret-change-me"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Verify JWT session token
  const token = req.cookies.get(COOKIE)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      if (payload && payload.role === "admin" && payload.sub) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. Intercept all /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      const res = NextResponse.redirect(loginUrl);
      // Invalidate cookie and prevent caching
      res.cookies.delete(COOKIE);
      res.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      );
      res.headers.set("Pragma", "no-cache");
      return res;
    }
  }

  // 2. Intercept sensitive API endpoints
  const isProtectedApi =
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/stats") ||
    pathname.startsWith("/api/people") ||
    pathname.startsWith("/api/academics") ||
    (pathname.startsWith("/api/attendance") && !pathname.startsWith("/api/attendance/mark")) ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/verify-password";

  if (isProtectedApi) {
    if (!isAuthenticated) {
      return NextResponse.json(
        {
          error: "Access Denied: Z++ Security Shield intercepted unauthorized request.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            Pragma: "no-cache",
          },
        }
      );
    }
  }

  // 3. If already authenticated and trying to access /admin/login, redirect to /admin
  if (pathname === "/admin/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // 4. Inject strict security headers on all responses
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=()"
  );
  res.headers.set("X-XSS-Protection", "1; mode=block");

  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    res.headers.set("Pragma", "no-cache");
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
  ],
};
