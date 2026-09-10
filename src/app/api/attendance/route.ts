import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const department = searchParams.get("department");
  const className = searchParams.get("class");
  const personId = searchParams.get("personId");
  const q = searchParams.get("q");

  const logs = await prisma.attendance.findMany({
    where: {
      ...(from || to
        ? {
            markedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(personId ? { personId } : {}),
      person: {
        ...(department ? { department } : {}),
        ...(className ? { className } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { rollNumber: { contains: q } },
              ],
            }
          : {}),
      },
    },
    include: {
      person: {
        select: {
          id: true,
          name: true,
          rollNumber: true,
          department: true,
          className: true,
          thumbnail: true,
        },
      },
    },
    orderBy: { markedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ logs });
}

const manualSchema = z.object({
  personId: z.string().min(1),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = manualSchema.parse(await req.json());
    const attendance = await prisma.attendance.create({
      data: {
        personId: body.personId,
        method: "manual",
        livenessPassed: true,
        note: body.note || "Manual override by admin",
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            rollNumber: true,
            department: true,
            className: true,
          },
        },
      },
    });
    return NextResponse.json({ attendance }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
