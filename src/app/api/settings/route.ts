import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    settings: settings || {
      id: "default",
      collegeName: "Kips College G-9",
      matchThreshold: 0.5,
      cameraFacing: "user",
      requireLiveness: true,
      darkModeDefault: false,
    },
  });
}

const schema = z.object({
  collegeName: z.string().min(2).max(120).optional(),
  matchThreshold: z.number().min(0.3).max(0.8).optional(),
  cameraFacing: z.enum(["user", "environment"]).optional(),
  requireLiveness: z.boolean().optional(),
  darkModeDefault: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        collegeName: body.collegeName || "Kips College G-9",
        matchThreshold: body.matchThreshold ?? 0.5,
        cameraFacing: body.cameraFacing || "user",
        requireLiveness: body.requireLiveness ?? true,
        darkModeDefault: body.darkModeDefault ?? false,
      },
      update: body,
    });
    return NextResponse.json({ settings });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
