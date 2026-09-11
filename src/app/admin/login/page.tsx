
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui/primitives";
import { analyticsIdentifyAdmin, analyticsEvent } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        await analyticsEvent("login_failed", {
          reason: data.error || "unknown",
          user_email: email,
        });
        return;
      }
      // Identify admin in Firebase Analytics on successful login
      if (data.admin) {
        await analyticsIdentifyAdmin({
          id: data.admin.id,
          email: data.admin.email,
          name: data.admin.name,
          role: "admin",
        });
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 landing-grid">
      <div className="w-full max-w-md animate-rise rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Admin Sign In
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Authorized staff only. Kips College G-9
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email">Username / Email</Label>
            <Input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--border)] pt-4 text-center">
          <p className="text-xs text-[var(--muted)]">
            © Kips College G-9. Secure Enterprise Portal. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
