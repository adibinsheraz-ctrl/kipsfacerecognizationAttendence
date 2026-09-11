import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptEmbeddings } from "@/lib/crypto";
import { invalidateEmbeddingCache } from "@/lib/embedding-cache";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().min(1).max(100).optional(),
  className: z.string().min(1).max(100).optional(),
  classId: z.string().optional().nullable(),
  role: z.enum(["student", "staff"]).optional(),
  active: z.boolean().optional(),
  thumbnail: z.string().optional().nullable(),
  descriptors: z.array(z.array(z.number())).min(3).max(8).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      department: true,
      className: true,
      classId: true,
      class: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      role: true,
      thumbnail: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { attendances: true } },
    },
  });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ person });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const body = updateSchema.parse(await req.json());

    let resolvedClassName = body.className;
    let resolvedDepartment = body.department;

    if (body.classId !== undefined) {
      if (body.classId) {
        const cls = await prisma.class.findUnique({
          where: { id: body.classId },
          include: { course: { include: { department: true } } },
        });
        if (cls) {
          resolvedClassName = cls.name;
          resolvedDepartment = cls.course.department.name;
        }
      } else {
        // Unlinked from class
      }
    }

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(resolvedDepartment !== undefined ? { department: resolvedDepartment } : {}),
        ...(resolvedClassName !== undefined ? { className: resolvedClassName } : {}),
        ...(body.classId !== undefined ? { classId: body.classId } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.thumbnail !== undefined ? { thumbnail: body.thumbnail } : {}),
        ...(body.descriptors ? { embeddings: encryptEmbeddings(body.descriptors) } : {}),
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        department: true,
        className: true,
        classId: true,
        role: true,
        thumbnail: true,
        active: true,
        updatedAt: true,
      },
    });
    invalidateEmbeddingCache();
    return NextResponse.json({ person });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    // Cascade delete is configured on Attendance (onDelete: Cascade),
    // so deleting the person also permanently deletes all their attendance records.
    await prisma.person.delete({
      where: { id },
    });
    invalidateEmbeddingCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to permanently delete person:", error);
    return NextResponse.json({ error: "Failed to delete person" }, { status: 500 });
  }
}
