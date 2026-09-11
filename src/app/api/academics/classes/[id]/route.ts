import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, endOfDay, subDays, subMonths, format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  courseId: z.string().min(1).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") || "weekly") as "weekly" | "monthly" | "yearly";

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      course: {
        include: {
          department: true,
        },
      },
      people: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          rollNumber: true,
          role: true,
          thumbnail: true,
          active: true,
          createdAt: true,
        },
        orderBy: { rollNumber: "asc" },
      },
    },
  });

  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const now = new Date();
  let startDate: Date;
  if (timeframe === "monthly") {
    startDate = startOfDay(subDays(now, 29));
  } else if (timeframe === "yearly") {
    startDate = startOfDay(subDays(now, 364));
  } else {
    // weekly
    startDate = startOfDay(subDays(now, 6));
  }
  const endDate = endOfDay(now);

  const studentIds = cls.people.map((p) => p.id);

  // Get all attendance logs for students of this class within timeframe
  const logs = await prisma.attendance.findMany({
    where: {
      personId: { in: studentIds },
      markedAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      personId: true,
      markedAt: true,
      status: true,
    },
    orderBy: { markedAt: "asc" },
  });

  // Calculate distinct active session dates for this class
  const classSessionDates = new Set<string>();
  logs.forEach((log) => {
    classSessionDates.add(format(new Date(log.markedAt), "yyyy-MM-dd"));
  });
  const totalSessions = classSessionDates.size;

  // Student specific attendance mapping
  const studentDaysMap = new Map<string, Set<string>>();
  studentIds.forEach((sid) => studentDaysMap.set(sid, new Set()));

  logs.forEach((log) => {
    const day = format(new Date(log.markedAt), "yyyy-MM-dd");
    studentDaysMap.get(log.personId)?.add(day);
  });

  const studentsWithStats = cls.people.map((person) => {
    const attendedDays = studentDaysMap.get(person.id)?.size || 0;
    const percentage =
      totalSessions > 0
        ? Math.round((attendedDays / totalSessions) * 100)
        : 100;

    return {
      ...person,
      attendedDays,
      totalSessions,
      attendancePercentage: percentage,
    };
  });

  // Calculate overall class average attendance percentage
  const totalPossible = cls.people.length * totalSessions;
  let totalAttendedMarks = 0;
  studentDaysMap.forEach((days) => {
    totalAttendedMarks += days.size;
  });
  const classAverageRate =
    totalPossible > 0 ? Math.round((totalAttendedMarks / totalPossible) * 100) : 100;

  // Build trend chart data
  const trend: Array<{ label: string; count: number; date: string }> = [];

  if (timeframe === "weekly") {
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const count = logs.filter(
        (l) => format(new Date(l.markedAt), "yyyy-MM-dd") === dayStr
      ).length;
      trend.push({
        label: format(day, "EEE (MMM d)"),
        date: dayStr,
        count,
      });
    }
  } else if (timeframe === "monthly") {
    // 30 days grouped
    for (let i = 29; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const count = logs.filter(
        (l) => format(new Date(l.markedAt), "yyyy-MM-dd") === dayStr
      ).length;
      trend.push({
        label: format(day, "MMM d"),
        date: dayStr,
        count,
      });
    }
  } else {
    // Yearly: 12 months
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(now, i);
      const monthStr = format(m, "yyyy-MM");
      const count = logs.filter(
        (l) => format(new Date(l.markedAt), "yyyy-MM") === monthStr
      ).length;
      trend.push({
        label: format(m, "MMM yyyy"),
        date: monthStr,
        count,
      });
    }
  }

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      course: cls.course,
      department: cls.course.department,
      enrolledCount: cls.people.length,
      totalSessions,
      averageAttendanceRate: classAverageRate,
      timeframe,
      trend,
      students: studentsWithStats,
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const body = updateSchema.parse(await req.json());
    const cls = await prisma.class.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.courseId ? { courseId: body.courseId } : {}),
      },
      include: {
        course: {
          include: {
            department: true,
          },
        },
      },
    });

    // Also update any denormalized className on people
    if (body.name) {
      await prisma.person.updateMany({
        where: { classId: id },
        data: { className: body.name.trim() },
      });
    }

    return NextResponse.json({ class: cls });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid class update data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    // Unlink people before deleting class so student data is preserved
    await prisma.person.updateMany({
      where: { classId: id },
      data: { classId: null },
    });

    await prisma.class.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
