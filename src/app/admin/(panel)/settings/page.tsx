"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, ShieldCheck, ShieldAlert, KeyRound, Loader2, Sparkles } from "lucide-react";
import { Button, Card, Input, Label, Skeleton } from "@/components/ui/primitives";
import { DeveloperCredits } from "@/components/DeveloperCredits";
import { useAppLock } from "@/components/admin/AppLockGuard";

export const dynamic = "force-dynamic";

type Settings = {
  collegeName: string;
  matchThreshold: number;
  cameraFacing: string;
  requireLiveness: boolean;
  darkModeDefault: boolean;
};

export default function SettingsPage() {
  const { isSettingsUnlocked, unlockSettings, lockSettings } = useAppLock();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Lock state inputs
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (isSettingsUnlocked) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) setSettings(d.settings);
        })
        .catch(() => {});
    }
  }, [isSettingsUnlocked]);

  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError(null);
    const success = await unlockSettings(password);
    if (!success) {
      setUnlockError("Invalid password. Access to Settings blocked.");
    } else {
      setPassword("");
    }
    setUnlocking(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
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
    } finally {
      setSaving(false);
    }
  }

  // 1. If Settings are Locked, render the Z++ High-Security Gateway
  if (!isSettingsUnlocked) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-6 animate-rise">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Lock size={32} className="animate-pulse" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--ink)]">
              Settings Locked
            </h1>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck size={13} /> Z++ SECURED
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Admin configuration, matching sensitivity, and campus branding are protected from unauthorized access.
          </p>
        </div>

        <Card className="p-6 border-amber-500/25 shadow-xl">
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <Label htmlFor="admin-pwd">Enter Admin Password to Unlock</Label>
              <div className="relative mt-1">
                <Input
                  id="admin-pwd"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <KeyRound
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
              </div>
            </div>

            {unlockError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={unlocking || !password}
              className="w-full h-11 bg-amber-500 text-black font-semibold hover:bg-amber-400 active:scale-[0.98] transition-transform shadow-md shadow-amber-500/20"
            >
              {unlocking ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Verifying Security Clearance...
                </>
              ) : (
                "Unlock Settings Console"
              )}
            </Button>
          </form>

          <div className="mt-5 border-t border-[var(--border)] pt-4 text-center">
            <p className="text-xs text-[var(--muted)] flex items-center justify-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              Next.js Edge Cryptographic Verification Active
            </p>
          </div>
        </Card>

        <div className="flex justify-center">
          <DeveloperCredits compact />
        </div>
      </div>
    );
  }

  // 2. Loading state after unlock
  if (!settings) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // 3. Unlocked Settings Editor with Lock Settings button
  return (
    <div className="mx-auto max-w-xl space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              Settings
            </h1>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck size={13} /> Unlocked
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            College branding, matching sensitivity, and camera defaults
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={lockSettings}
          className="flex items-center gap-1.5 text-xs border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
        >
          <Lock size={13} />
          Lock Settings
        </Button>
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

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>
              Save settings
            </Button>
            {saved ? (
              <p className="text-sm font-medium text-[var(--success)] flex items-center gap-1">
                <ShieldCheck size={16} /> Settings saved & encrypted
              </p>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="p-6 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)] flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-500" /> Security Status: Z++ Active
        </p>
        <p className="mt-2">
          Face embeddings are AES-256-GCM encrypted at rest. Matching uses real-time
          biometric vectors with liveness blink verification. Direct API queries to
          settings and data endpoints are protected by Edge Middleware shields.
        </p>
        <div className="mt-4">
          <DeveloperCredits />
        </div>
      </Card>
    </div>
  );
}
