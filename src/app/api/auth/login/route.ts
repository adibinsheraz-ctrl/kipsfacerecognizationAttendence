import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import {
  checkLoginLockout,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/security";

const schema = z.object({
  email: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 1. Check if IP is currently locked out from brute-force attempts
  const lockoutStatus = checkLoginLockout(ip);
  if (lockoutStatus.isLocked) {
    return NextResponse.json(
      {
        error: `Security lock active: Too many failed login attempts. Try again in ${lockoutStatus.remainingSeconds} seconds.`,
        locked: true,
        remainingSeconds: lockoutStatus.remainingSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(lockoutStatus.remainingSeconds),
        },
      }
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
      // Record failed attempt and evaluate lockout
      const failureResult = await recordLoginFailure(ip, normalizedEmail);

      if (failureResult.isLocked) {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Security lock active for ${failureResult.remainingSeconds} seconds.`,
            locked: true,
            remainingSeconds: failureResult.remainingSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(failureResult.remainingSeconds),
            },
          }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid credentials. ${failureResult.remainingAttempts} attempt(s) remaining before security lockout.`,
          remainingAttempts: failureResult.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 2. Successful authentication: record success and clear failures
    await recordLoginSuccess(ip, normalizedEmail);
    await createSession({ id: admin.id, email: admin.email, name: admin.name });

    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
