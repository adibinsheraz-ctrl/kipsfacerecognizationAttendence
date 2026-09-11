"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  Settings,
  LogOut,
  ScanFace,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/classes", label: "Classes & Depts", icon: GraduationCap },
  { href: "/admin/people", label: "People", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6 md:flex">
          <div className="px-2">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
              Kips College G-9
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Attendance admin</p>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-4">
            <Link
              href="/kiosk"
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            >
              <ScanFace size={18} strokeWidth={1.75} />
              Open kiosk
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            >
              <LogOut size={18} strokeWidth={1.75} />
              Sign out
            </button>
            <p className="px-3 pt-1 text-xs text-[var(--muted)]">{adminName}</p>
            <div className="px-3 pt-3 pb-1 border-t border-[var(--border)] mt-2">
              <p className="text-[10px] leading-relaxed text-[var(--muted)] opacity-70">
                &copy; {new Date().getFullYear()} Kips College G-9
              </p>
              <p className="text-[10px] text-[var(--muted)] opacity-70">
                Built by{" "}
                <a
                  href="mailto:adi.binsheraz@gmail.com"
                  className="underline underline-offset-2 hover:opacity-100 transition-opacity"
                >
                  Adi Bin Sheraz
                </a>
              </p>
              <p className="text-[10px] text-[var(--muted)] opacity-50 mt-0.5">
                All Rights Reserved.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 backdrop-blur md:hidden">
            <p className="font-[family-name:var(--font-display)] font-semibold">Kips Admin</p>
            <button onClick={logout} className="text-sm text-[var(--muted)]">
              Sign out
            </button>
          </header>
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-2 py-2 md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm",
                  pathname === link.href
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
          <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center sm:px-8">
            <p className="text-[11px] text-[var(--muted)] opacity-60">
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="mailto:adi.binsheraz@gmail.com"
                className="underline underline-offset-2 hover:opacity-100 transition-opacity"
              >
                Adi Bin Sheraz
              </a>
              {" - "} Kips College G-9 Attendance System. All Rights Reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
