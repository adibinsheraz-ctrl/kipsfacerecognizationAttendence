import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptEmbeddings } from "@/lib/crypto";
import { invalidateEmbeddingCache } from "@/lib/embedding-cache";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  rollNumber: z.string().min(1).max(50),
  department: z.string().min(1).max(100),
  className: z.string().min(1).max(100),
  role: z.enum(["student", "staff"]).default("student"),
  thumbnail: z.string().optional().nullable(),
  descriptors: z.array(z.array(z.number())).min(3).max(8),
});

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const active = searchParams.get("active");

  const people = await prisma.person.findMany({
    where: {
      ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { rollNumber: { contains: q } },
              { department: { contains: q } },
              { className: { contains: q } },
            ],
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

    const person = await prisma.person.create({
      data: {
        name: body.name,
        rollNumber: body.rollNumber,
        department: body.department,
        className: body.className,
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
