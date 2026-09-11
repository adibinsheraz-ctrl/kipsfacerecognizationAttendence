import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/face-match";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  // Max 5 password verification attempts per minute per admin IP
  if (!checkRateLimit(`verify-pwd:${admin.id}:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Security freeze active for 1 minute." },
      { status: 429 }
    );
  }

  try {
    const body = schema.parse(await req.json());
    const dbAdmin = await prisma.admin.findUnique({
      where: { id: admin.id },
    });

    if (!dbAdmin || !(await verifyPassword(body.password, dbAdmin.passwordHash))) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid password format" }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
