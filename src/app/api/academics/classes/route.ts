import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  courseId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    const existing = await prisma.class.findUnique({
      where: {
        courseId_name: {
          courseId: body.courseId,
          name: body.name.trim(),
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Class already exists in this course" },
        { status: 409 }
      );
    }

    const cls = await prisma.class.create({
      data: {
        courseId: body.courseId,
        name: body.name.trim(),
      },
      include: {
        course: {
          include: {
            department: true,
          },
        },
      },
    });

    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid class data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
