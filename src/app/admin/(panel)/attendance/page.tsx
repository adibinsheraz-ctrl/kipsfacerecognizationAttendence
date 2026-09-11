"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";

type Log = {
  id: string;
  markedAt: string;
  method: string;
  confidence: number | null;
  status: string;
  person: {
    name: string;
    rollNumber: string;
    department: string;
    className: string;
    thumbnail: string | null;
  };
};

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<Array<{ name: string; courseName?: string }>>([]);

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (q) params.set("q", q);
    if (department) params.set("department", department);
    if (className) params.set("class", className);
    const res = await fetch(`/api/attendance?${params}`);
    const data = await res.json();
    setLogs(data.logs || []);
  }

  useEffect(() => {
    load();
    fetch("/api/academics/hierarchy")
      .then((r) => r.json())
      .then((d) => {
        const clsList: Array<{ name: string; courseName?: string }> = [];
        (d.departments || []).forEach((dept: { courses?: Array<{ name: string; classes?: Array<{ name: string }> }> }) => {
          (dept.courses || []).forEach((course) => {
            (course.classes || []).forEach((c) => {
              clsList.push({ name: c.name, courseName: course.name });
            });
          });
        });
        setClasses(clsList);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportFile(type: "csv" | "xlsx") {
    const params = new URLSearchParams({ format: type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/attendance/export?${params}`;
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Attendance logs
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live attendance scans with visual reference photo confirmation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => exportFile("csv")}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => exportFile("xlsx")}>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
        <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
        >
          <option value="">All Classes</option>
          {classes.map((c, i) => (
            <option key={i} value={c.name}>
              {c.courseName ? `${c.courseName} - ${c.name}` : c.name}
            </option>
          ))}
        </select>
        <Input placeholder="Search name or roll" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={load}>Apply filters</Button>
      </div>

      {!logs ? (
        <Skeleton className="h-64" />
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState
            title="No attendance records"
            description="Marked scans from the kiosk will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--muted)] text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Person (Reference Photo)</th>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Match</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {log.person.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={log.person.thumbnail}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover border border-[var(--border)] shadow-2xs"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)] border border-[var(--border)]">
                            {log.person.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm text-[var(--ink)]">{log.person.name}</p>
                          <p className="text-xs text-[var(--muted)]">{log.person.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{log.person.rollNumber}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{log.person.className}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {format(new Date(log.markedAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-3 capitalize text-xs text-[var(--muted)]">{log.method}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.confidence != null ? (
                        <span className="font-medium text-[var(--success)]">
                          {Math.round(log.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">n/a</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
