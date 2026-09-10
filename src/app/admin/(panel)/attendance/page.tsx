"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button, Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";

type Log = {
  id: string;
  markedAt: string;
  method: string;
  confidence: number | null;
  person: {
    name: string;
    rollNumber: string;
    department: string;
    className: string;
  };
};

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (q) params.set("q", q);
    if (department) params.set("department", department);
    const res = await fetch(`/api/attendance?${params}`);
    const data = await res.json();
    setLogs(data.logs || []);
  }

  useEffect(() => {
    load();
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
            Filter by date and export for records
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
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
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Roll</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium">{log.person.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{log.person.rollNumber}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{log.person.className}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {format(new Date(log.markedAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--muted)]">{log.method}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {log.confidence != null ? `${Math.round(log.confidence * 100)}%` : "n/a"}
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
