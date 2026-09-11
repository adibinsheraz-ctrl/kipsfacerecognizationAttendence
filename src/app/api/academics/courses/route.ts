import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    const existing = await prisma.course.findUnique({
      where: {
        departmentId_name: {
          departmentId: body.departmentId,
          name: body.name.trim(),
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Course already exists in this department" },
        { status: 409 }
      );
    }

    const course = await prisma.course.create({
      data: {
        departmentId: body.departmentId,
        name: body.name.trim(),
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid course data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
