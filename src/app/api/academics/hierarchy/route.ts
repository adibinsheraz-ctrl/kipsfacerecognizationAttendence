import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        courses: {
          orderBy: { name: "asc" },
          include: {
            classes: {
              orderBy: { name: "asc" },
              include: {
                _count: {
                  select: { people: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Failed to fetch academic hierarchy:", error);
    return NextResponse.json({ error: "Failed to fetch academic hierarchy" }, { status: 500 });
  }
}
