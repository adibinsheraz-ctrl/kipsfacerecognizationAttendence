import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.securityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        ip: true,
        email: true,
        details: true,
        createdAt: true,
      },
    });

    const failedCount24h = await prisma.securityLog.count({
      where: {
        type: { in: ["login_failed", "account_locked"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return NextResponse.json({ logs, failedCount24h });
  } catch (err) {
    console.error("Failed to fetch security logs:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
