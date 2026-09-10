import { NextResponse } from "next/server";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [enrolled, presentToday, recentScans, failedToday] = await Promise.all([
    prisma.person.count({ where: { active: true } }),
    prisma.attendance.findMany({
      where: { markedAt: { gte: todayStart, lte: todayEnd } },
      distinct: ["personId"],
      select: { personId: true },
    }),
    prisma.attendance.findMany({
      take: 8,
      orderBy: { markedAt: "desc" },
      include: {
        person: {
          select: { name: true, rollNumber: true, thumbnail: true, department: true },
        },
      },
    }),
    prisma.recognitionAttempt.count({
      where: {
        success: false,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  const presentCount = presentToday.length;
  const rate = enrolled > 0 ? Math.round((presentCount / enrolled) * 100) : 0;

  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(now, i);
    const count = await prisma.attendance.count({
      where: {
        markedAt: { gte: startOfDay(day), lte: endOfDay(day) },
      },
    });
    trend.push({
      date: format(day, "MMM d"),
      count,
    });
  }

  return NextResponse.json({
    overview: {
      enrolled,
      presentToday: presentCount,
      attendanceRate: rate,
      failedAttemptsToday: failedToday,
    },
    recentScans,
    trend,
  });
}
