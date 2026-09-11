import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptEmbeddings } from "@/lib/crypto";
import { invalidateEmbeddingCache } from "@/lib/embedding-cache";

import { sanitizeText, thumbnailSchema, descriptorsArraySchema } from "@/lib/sanitize";

const createSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeText),
  rollNumber: z.string().min(1).max(50).transform(sanitizeText),
  department: z.string().min(1).max(100).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  className: z.string().min(1).max(100).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  classId: z.string().optional().nullable(),
  role: z.enum(["student", "staff"]).default("student"),
  thumbnail: thumbnailSchema,
  descriptors: descriptorsArraySchema,
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const active = searchParams.get("active");
  const classId = searchParams.get("classId");
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const people = await prisma.person.findMany({
    where: {
      ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
      ...(classId ? { classId } : {}),
      ...(tokens.length > 0
        ? {
            AND: tokens.map((token) => ({
              OR: [
                { name: { contains: token, mode: "insensitive" as const } },
                { rollNumber: { contains: token, mode: "insensitive" as const } },
                { department: { contains: token, mode: "insensitive" as const } },
                { className: { contains: token, mode: "insensitive" as const } },
                { role: { contains: token, mode: "insensitive" as const } },
                { class: { name: { contains: token, mode: "insensitive" as const } } },
                { class: { course: { name: { contains: token, mode: "insensitive" as const } } } },
                { class: { course: { department: { name: { contains: token, mode: "insensitive" as const } } } } },
              ],
            })),
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
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
    },
  });

  return NextResponse.json({ people });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    const existing = await prisma.person.findUnique({
      where: { rollNumber: body.rollNumber },
    });
    if (existing) {
      return NextResponse.json({ error: "Roll number already enrolled" }, { status: 409 });
    }

    let classId = body.classId || null;
    let resolvedClassName = body.className || "";
    let resolvedDepartment = body.department || "";

    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: { course: { include: { department: true } } },
      });
      if (cls) {
        resolvedClassName = cls.name;
        resolvedDepartment = cls.course.department.name;
      }
    } else if (resolvedClassName) {
      const cls = await prisma.class.findFirst({
        where: { name: resolvedClassName },
        include: { course: { include: { department: true } } },
      });
      if (cls) {
        classId = cls.id;
        resolvedDepartment = cls.course.department.name;
      }
    }

    const person = await prisma.person.create({
      data: {
        name: body.name,
        rollNumber: body.rollNumber,
        department: resolvedDepartment,
        className: resolvedClassName,
        classId,
        role: body.role,
        thumbnail: body.thumbnail || null,
        embeddings: encryptEmbeddings(body.descriptors),
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
        createdAt: true,
      },
    });

    invalidateEmbeddingCache();
    return NextResponse.json({ person }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid enrollment data", details: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to enroll person" }, { status: 500 });
  }
}
