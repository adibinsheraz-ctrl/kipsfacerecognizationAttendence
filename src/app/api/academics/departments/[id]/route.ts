import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const body = updateSchema.parse(await req.json());
    const department = await prisma.department.update({
      where: { id },
      data: { name: body.name.trim() },
    });
    return NextResponse.json({ department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid department data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    await prisma.department.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
