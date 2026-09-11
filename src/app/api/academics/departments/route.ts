import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    const existing = await prisma.department.findUnique({
      where: { name: body.name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "Department already exists" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: { name: body.name.trim() },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid department name" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
