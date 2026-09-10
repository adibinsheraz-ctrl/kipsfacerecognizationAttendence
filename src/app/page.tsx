import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { DeveloperCredits } from "@/components/DeveloperCredits";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden landing-grid">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between animate-rise">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--ink)]">
            Face Attendance
          </p>
          <Link
            href="/admin/login"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            Admin sign in
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <div className="max-w-2xl animate-rise" style={{ animationDelay: "80ms" }}>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl">
              Kips College G-9
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted)]">
              Walk up. Look at the camera. Marked present with live face
              verification, not a photo held up to the lens.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/kiosk">
                <Button size="lg">Open attendance kiosk</Button>
              </Link>
              <Link href="/admin/login">
                <Button size="lg" variant="secondary">
                  Manage people
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <footer
          className="flex flex-col gap-4 border-t border-[var(--border)]/80 pt-6 sm:flex-row sm:items-center sm:justify-between animate-rise"
          style={{ animationDelay: "160ms" }}
        >
          <DeveloperCredits />
        </footer>
      </div>
    </div>
  );
}
