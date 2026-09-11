import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  departmentId: z.string().min(1).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const body = updateSchema.parse(await req.json());
    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.departmentId ? { departmentId: body.departmentId } : {}),
      },
      include: {
        department: true,
      },
    });
    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid course data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    await prisma.course.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
