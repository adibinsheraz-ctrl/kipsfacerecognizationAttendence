"use client";

import { useEffect, useState } from "react";
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
import { format } from "date-fns";
import { Button, Card, Skeleton } from "@/components/ui/primitives";

type Stats = {
  overview: {
    enrolled: number;
    presentToday: number;
    attendanceRate: number;
    failedAttemptsToday: number;
  };
  recentScans: Array<{
    id: string;
    markedAt: string;
    person: {
      name: string;
      rollNumber: string;
      thumbnail: string | null;
      department: string;
    };
  }>;
  trend: Array<{ date: string; count: number }>;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const cards = [
    {
      label: "Today's attendance",
      value: `${stats.overview.attendanceRate}%`,
      hint: `${stats.overview.presentToday} of ${stats.overview.enrolled} enrolled`,
    },
    {
      label: "Enrolled people",
      value: String(stats.overview.enrolled),
      hint: "Active face profiles",
    },
    {
      label: "Failed scans today",
      value: String(stats.overview.failedAttemptsToday),
      hint: "Possible spoof or mismatch",
    },
  ];

  return (
    <div className="space-y-8 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live campus attendance for Kips College G-9
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/kiosk">
            <Button variant="secondary">Open kiosk</Button>
          </Link>
          <Link href="/admin/people/new">
            <Button>Enroll person</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-sm text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {c.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{c.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="font-medium">7-day trend</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="fillAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c6e6e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0c6e6e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0c6e6e"
                  fill="url(#fillAtt)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-medium">Recent scans</h2>
          <ul className="mt-4 space-y-3">
            {stats.recentScans.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No scans yet today.</li>
            ) : (
              stats.recentScans.map((scan) => (
                <li key={scan.id} className="flex items-center gap-3">
                  {scan.person.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scan.person.thumbnail}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm text-[var(--accent)]">
                      {scan.person.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{scan.person.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {scan.person.department}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {format(new Date(scan.markedAt), "HH:mm")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
