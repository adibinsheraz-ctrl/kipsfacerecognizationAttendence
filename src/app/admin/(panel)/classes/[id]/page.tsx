"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GraduationCap,
  Download,
  Users,
  Calendar,
  Percent,
  Search,
  UserPlus,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { TransferClassModal } from "@/components/ui/TransferClassModal";
import { TransferIntoClassModal } from "@/components/ui/TransferIntoClassModal";

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  role: string;
  thumbnail: string | null;
  active: boolean;
  attendedDays: number;
  totalSessions: number;
  attendancePercentage: number;
};

type ClassDetail = {
  id: string;
  name: string;
  course: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  };
  enrolledCount: number;
  totalSessions: number;
  averageAttendanceRate: number;
  timeframe: "weekly" | "monthly" | "yearly";
  trend: Array<{ label: string; count: number; date: string }>;
  students: Student[];
};

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ClassDetail | null>(null);
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transferStudent, setTransferStudent] = useState<{
    id: string;
    name: string;
    className: string;
    department: string;
    classId?: string | null;
  } | null>(null);
  const [transferIntoModalOpen, setTransferIntoModalOpen] = useState(false);

  async function loadClassData(tf = timeframe) {
    try {
      setLoading(true);
      const res = await fetch(`/api/academics/classes/${id}?timeframe=${tf}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.class);
      } else {
        setError(json.error || "Failed to load class");
      }
    } catch {
      setError("Network error while loading class details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClassData(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, timeframe]);

  function handleExport(format: "csv" | "xlsx") {
    window.location.href = `/api/academics/classes/${id}/export?format=${format}&timeframe=${timeframe}`;
  }

  // Smart multi-token student search (e.g. "ad", "adi", "bin", "sheraz")
  const searchTokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filteredStudents = data?.students.filter((s) => {
    if (searchTokens.length === 0) return true;
    const nameLower = s.name.toLowerCase();
    const rollLower = s.rollNumber.toLowerCase();
    const roleLower = s.role.toLowerCase();
    return searchTokens.every(
      (token) =>
        nameLower.includes(token) ||
        rollLower.includes(token) ||
        roleLower.includes(token)
    );
  });

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/classes"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} /> Back to Classes & Depts
        </Link>
        <Card className="p-8 text-center text-[var(--danger)]">{error}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      {/* Breadcrumb & Top Bar */}
      <div>
        <Link
          href="/admin/classes"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <ArrowLeft size={15} /> Back to Classes & Depts
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[var(--accent-soft)] p-1.5 text-[var(--accent)]">
                <GraduationCap size={20} />
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--ink)]">
                Class {data ? data.name : <span className="inline-block h-6 w-24 animate-pulse rounded bg-[var(--surface-muted)]" />}
              </h1>
            </div>
            {data ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                Department: <span className="font-medium text-[var(--ink)]">{data.department.name}</span> • Course: <span className="font-medium text-[var(--ink)]">{data.course.name}</span>
              </p>
            ) : (
              <Skeleton className="mt-1 h-4 w-48" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport("csv")}
              title="Export only this class's attendance in CSV format"
            >
              <FileText size={15} />
              Download CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport("xlsx")}
              title="Export only this class's attendance in Excel format"
            >
              <FileSpreadsheet size={15} />
              Download Excel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTransferIntoModalOpen(true)}
              title="Transfer an existing student into this class"
            >
              <ArrowRightLeft size={14} />
              Transfer Student In
            </Button>
            <Link href="/admin/people/new">
              <Button size="sm">
                <UserPlus size={15} />
                Enroll student
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Timeframe selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border)] py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Timeframe:
          </span>
          <div className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-1">
            {(["weekly", "monthly", "yearly"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-[7px] px-3 py-1 text-xs font-medium capitalize transition-all ${
                  timeframe === tf
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--muted)]">
          {timeframe === "weekly" && "Viewing attendance across the last 7 days"}
          {timeframe === "monthly" && "Viewing attendance across the last 30 days"}
          {timeframe === "yearly" && "Viewing attendance across the last 12 months"}
        </p>
      </div>

      {/* Overview Stat Cards */}
      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--muted)]">Average Attendance</p>
              <Percent size={16} className="text-[var(--accent)]" />
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
              {data.averageAttendanceRate}%
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Across all enrolled students ({timeframe})
            </p>
          </Card>

          <Card className="p-4.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--muted)]">Enrolled Students</p>
              <Users size={16} className="text-[var(--accent)]" />
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
              {data.enrolledCount}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Active student face profiles
            </p>
          </Card>

          <Card className="p-4.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--muted)]">Class Sessions Held</p>
              <Calendar size={16} className="text-[var(--accent)]" />
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
              {data.totalSessions}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Days with recorded attendance
            </p>
          </Card>
        </div>
      ) : null}

      {/* Attendance Trend Chart */}
      {data && data.trend.length > 0 ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              Attendance Trend ({timeframe})
            </h2>
            <span className="text-xs text-[var(--muted)]">
              Daily marked scans for {data.name}
            </span>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="classAttGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c6e6e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0c6e6e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0c6e6e"
                  fill="url(#classAttGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {/* Student List Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
              Student Roster & Attendance
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Visual reference photos and calculated attendance % for {data?.name || "this class"}
            </p>
          </div>

          <div className="flex w-full max-w-xs items-center gap-2 sm:w-auto">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search name, roll (e.g. adi, bin)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && !data ? (
          <Skeleton className="h-64" />
        ) : !data || data.students.length === 0 ? (
          <Card>
            <EmptyState
              title="No students enrolled in this class yet"
              description="Enroll students into this class using face scan or transfer existing students from other classes."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTransferIntoModalOpen(true)}
                  >
                    <ArrowRightLeft size={14} />
                    Transfer student in
                  </Button>
                  <Link href="/admin/people/new">
                    <Button size="sm">Enroll new student</Button>
                  </Link>
                </div>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/60 text-[var(--muted)] text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Roll Number</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold text-center">Sessions ({timeframe})</th>
                    <th className="px-4 py-3 font-semibold">Attendance %</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents && filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/30 transition-colors"
                      >
                        {/* Student Name & Reference Photo */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {student.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={student.thumbnail}
                                alt={student.name}
                                className="h-10 w-10 rounded-full object-cover border border-[var(--border)] shadow-2xs"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)] border border-[var(--border)]">
                                {student.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm text-[var(--ink)]">
                                {searchTokens.length > 0 ? (
                                  <>
                                    {student.name.split(new RegExp(`(${searchTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")).map((part, i) =>
                                      new RegExp(`^(${searchTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`, "i").test(part) ? (
                                        <mark key={i} className="rounded bg-[var(--accent-soft)] px-0.5 font-bold text-[var(--accent)]">
                                          {part}
                                        </mark>
                                      ) : (
                                        <span key={i}>{part}</span>
                                      )
                                    )}
                                  </>
                                ) : (
                                  student.name
                                )}
                              </p>
                              <span className="text-xs text-[var(--muted)]">
                                Display photo (compressed)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Roll Number */}
                        <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                          {searchTokens.length > 0 ? (
                            <>
                              {student.rollNumber.split(new RegExp(`(${searchTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")).map((part, i) =>
                                new RegExp(`^(${searchTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`, "i").test(part) ? (
                                  <mark key={i} className="rounded bg-[var(--accent-soft)] px-0.5 font-bold text-[var(--accent)]">
                                    {part}
                                  </mark>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </>
                          ) : (
                            student.rollNumber
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 capitalize text-xs text-[var(--muted)]">
                          {student.role}
                        </td>

                        {/* Sessions attended */}
                        <td className="px-4 py-3 text-center text-xs">
                          <span className="font-semibold text-[var(--ink)]">
                            {student.attendedDays}
                          </span>
                          <span className="text-[var(--muted)]"> / {student.totalSessions}</span>
                        </td>

                        {/* Attendance % with progress bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-16 h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  student.attendancePercentage >= 75
                                    ? "bg-[var(--success)]"
                                    : student.attendancePercentage >= 50
                                    ? "bg-[var(--warning)]"
                                    : "bg-[var(--danger)]"
                                }`}
                                style={{ width: `${student.attendancePercentage}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                student.attendancePercentage >= 75
                                  ? "text-[var(--success)]"
                                  : student.attendancePercentage >= 50
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--danger)]"
                              }`}
                            >
                              {student.attendancePercentage}%
                            </span>
                          </div>
                        </td>

                        {/* Action link */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setTransferStudent({
                                  id: student.id,
                                  name: student.name,
                                  className: data.name,
                                  department: data.department.name,
                                  classId: data.id,
                                })
                              }
                              title="Transfer to another class"
                              className="inline-flex items-center gap-1 rounded-[8px] px-2 h-8 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] transition-all"
                            >
                              <ArrowRightLeft size={13} />
                              Transfer
                            </button>
                            <Link href={`/admin/people/${student.id}`}>
                              <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs">
                                Profile
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[var(--muted)]">
                        No students matching &ldquo;{search}&rdquo;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Transfer Class Modal (moving student out) */}
      <TransferClassModal
        open={transferStudent !== null}
        person={transferStudent}
        onSuccess={() => {
          setTransferStudent(null);
          loadClassData();
        }}
        onCancel={() => setTransferStudent(null)}
      />

      {/* Transfer Into Class Modal (moving student in) */}
      <TransferIntoClassModal
        open={transferIntoModalOpen}
        targetClass={
          data
            ? {
                id: data.id,
                name: data.name,
                courseName: data.course.name,
                deptName: data.department.name,
              }
            : null
        }
        onSuccess={() => {
          setTransferIntoModalOpen(false);
          loadClassData();
        }}
        onCancel={() => setTransferIntoModalOpen(false)}
      />
    </div>
  );
}
