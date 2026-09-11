"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui/primitives";
import { DeveloperCredits } from "@/components/DeveloperCredits";

type Settings = {
  collegeName: string;
  matchThreshold: number;
  cameraFacing: string;
  requireLiveness: boolean;
  darkModeDefault: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
      document.documentElement.classList.toggle("dark", data.settings.darkModeDefault);
    }
    setSaving(false);
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-rise">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          College branding, matching sensitivity, and camera defaults
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label>College name</Label>
            <Input
              value={settings.collegeName}
              onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
            />
          </div>
          <div>
            <Label>Match threshold ({settings.matchThreshold.toFixed(2)})</Label>
            <input
              type="range"
              min={0.35}
              max={0.7}
              step={0.01}
              value={settings.matchThreshold}
              onChange={(e) =>
                setSettings({ ...settings, matchThreshold: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[var(--accent)]"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Lower is stricter. Default 0.50 works well for most lighting.
            </p>
          </div>
          <div>
            <Label>Default camera</Label>
            <select
              className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm"
              value={settings.cameraFacing}
              onChange={(e) => setSettings({ ...settings, cameraFacing: e.target.value })}
            >
              <option value="user">Front camera</option>
              <option value="environment">Rear camera</option>
            </select>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.requireLiveness}
              onChange={(e) =>
                setSettings({ ...settings, requireLiveness: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Require blink liveness (anti-spoofing)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.darkModeDefault}
              onChange={(e) =>
                setSettings({ ...settings, darkModeDefault: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Prefer dark mode
          </label>

          <Button type="submit" loading={saving}>
            Save settings
          </Button>
          {saved ? (
            <p className="text-sm text-[var(--success)]">Settings saved</p>
          ) : null}
        </form>
      </Card>

      <Card className="p-6 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">About</p>
        <p className="mt-2">
          Face embeddings are encrypted at rest. Matching uses only the live face
          scan, not passwords or ID cards for attendance.
        </p>
        <div className="mt-4">
          <DeveloperCredits />
        </div>
        <p className="mt-4 text-xs">
          Data file: prisma/dev.db (SQLite). Attendance and face embeddings update
          immediately when you enroll or edit someone.
        </p>
      </Card>
    </div>
  );
}
