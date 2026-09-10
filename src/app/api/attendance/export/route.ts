import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { format } from "date-fns";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const formatType = searchParams.get("format") || "csv";

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
    },
    include: {
      person: true,
    },
    orderBy: { markedAt: "desc" },
  });

  const rows = logs.map((l) => ({
    Name: l.person.name,
    "Roll Number": l.person.rollNumber,
    Department: l.person.department,
    Class: l.person.className,
    Date: format(l.markedAt, "yyyy-MM-dd"),
    Time: format(l.markedAt, "HH:mm:ss"),
    Method: l.method,
    Confidence: l.confidence != null ? Math.round(l.confidence * 100) + "%" : "",
    Note: l.note || "",
  }));

  if (formatType === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kips-attendance.xlsx"`,
      },
    });
  }

  const header = Object.keys(rows[0] || {
    Name: "",
    "Roll Number": "",
    Department: "",
    Class: "",
    Date: "",
    Time: "",
    Method: "",
    Confidence: "",
    Note: "",
  });
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      header
        .map((h) => {
          const val = String((r as Record<string, string>)[h] ?? "");
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kips-attendance.csv"`,
    },
  });
}
