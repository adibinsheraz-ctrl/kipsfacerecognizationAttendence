import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/face-match";

const schema = z.object({
  email: z.string().min(3),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  // Anti-bruteforce security: max 5 login attempts per minute per IP
  if (!checkRateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts. Security lock active. Try again in 1 minute." },
      { status: 429 }
    );
  }

  try {
    const body = schema.parse(await req.json());
    const admin = await prisma.admin.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });
    if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await createSession({ id: admin.id, email: admin.email, name: admin.name });
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (e) {
    console.error("Login error:", e);
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
