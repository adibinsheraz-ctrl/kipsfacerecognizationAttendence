"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Search, X, Loader2, ArrowRightLeft, UserCheck } from "lucide-react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { TransferClassModal } from "@/components/ui/TransferClassModal";

type Person = {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  className: string;
  classId?: string | null;
  class?: {
    id: string;
    name: string;
    course?: {
      id: string;
      name: string;
      department?: { id: string; name: string };
    };
  } | null;
  role: string;
  thumbnail: string | null;
  active: boolean;
};

// Highlights any matching search tokens in text
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (tokens.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${tokens.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded bg-[var(--accent-soft)] px-0.5 font-bold text-[var(--accent)]"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; courseName?: string }>>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [, startTransition] = useTransition();

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  // Transfer class modal state
  const [transferTarget, setTransferTarget] = useState<Person | null>(null);

  async function load(query = q, classId = selectedClassId) {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (classId) params.set("classId", classId);
      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      startTransition(() => {
        setPeople(data.people || []);
      });
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  // Initial load of classes hierarchy
  useEffect(() => {
    fetch("/api/academics/hierarchy")
      .then((r) => r.json())
      .then((d) => {
        const clsList: Array<{ id: string; name: string; courseName?: string }> = [];
        (d.departments || []).forEach(
          (dept: {
            courses?: Array<{
              name: string;
              classes?: Array<{ id: string; name: string }>;
            }>;
          }) => {
            (dept.courses || []).forEach((course) => {
              (course.classes || []).forEach((c) => {
                clsList.push({ id: c.id, name: c.name, courseName: course.name });
              });
            });
          }
        );
        setClasses(clsList);
      })
      .catch(() => {});
  }, []);

  // Real-time debounced search (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      load(q, selectedClassId);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selectedClassId]);

  async function toggleActive(person: Person) {
    await fetch(`/api/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !person.active }),
    });
    load();
  }

  async function permanentlyDelete(person: Person) {
    const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to delete");
    }
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6 animate-rise">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            People
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Enroll faces, edit profiles, search and manage class assignments
          </p>
        </div>
        <Link href="/admin/people/new">
          <Button>Enroll person</Button>
        </Link>
      </div>

      {/* Smart Search Bar & Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--muted)]">
            {searching ? (
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
            ) : (
              <Search size={16} />
            )}
          </div>
          <input
            type="text"
            placeholder="Search name, roll, class (e.g. adi, bin, sheraz)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] pl-10 pr-10 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Class Filter Dropdown */}
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="h-11 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseName ? `${c.courseName} - ${c.name}` : c.name}
            </option>
          ))}
        </select>

        {/* Active Filter Indicators */}
        {(q || selectedClassId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setSelectedClassId("");
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--danger)]"
          >
            Reset filters
          </Button>
        )}
      </div>

      {/* Results summary pill when query is active */}
      {q && people && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>
            Found <strong className="text-[var(--ink)]">{people.length}</strong> matching{" "}
            {people.length === 1 ? "record" : "records"} for &ldquo;{q}&rdquo;
          </span>
          <button
            onClick={() => setQ("")}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Table / Empty State */}
      {!people ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : people.length === 0 ? (
        <Card>
          {q || selectedClassId ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                <Search size={22} />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--ink)]">
                No students or staff found
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                No matches found for &ldquo;{q}&rdquo;
                {selectedClassId ? " in this class" : ""}. Try searching by first name, last
                name, roll number, or part of a word (e.g. &ldquo;ad&rdquo;, &ldquo;adi&rdquo;, &ldquo;sheraz&rdquo;).
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setSelectedClassId("");
                  }}
                >
                  Clear search
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No one enrolled yet"
              description="Add a student or staff member and capture 3 to 5 face angles for reliable matching."
              action={
                <Link href="/admin/people/new">
                  <Button>Enroll first person</Button>
                </Link>
              }
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-4 py-3 font-medium">Roll</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/20 transition-colors"
                  >
                    {/* Person / Display Photo / Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnail}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover border border-[var(--border)] shadow-2xs"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)] border border-[var(--border)]">
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            <Highlight text={p.name} query={q} />
                          </p>
                          <p className="text-xs text-[var(--muted)] capitalize">
                            {p.role} · <Highlight text={p.department} query={q} />
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Roll Number */}
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                      <Highlight text={p.rollNumber} query={q} />
                    </td>

                    {/* Class */}
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.classId ? (
                        <Link
                          href={`/admin/classes/${p.classId}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          <Highlight text={p.className} query={q} />
                        </Link>
                      ) : (
                        <Highlight text={p.className || "Unassigned"} query={q} />
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.active
                            ? "text-[var(--success)] text-xs font-medium"
                            : "text-[var(--muted)] text-xs"
                        }
                      >
                        {p.active ? "● Active" : "○ Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/people/${p.id}`}>
                          <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs">
                            Edit
                          </Button>
                        </Link>
                        <button
                          onClick={() => setTransferTarget(p)}
                          title="Transfer to another class"
                          className="inline-flex items-center gap-1 rounded-[8px] px-2 h-8 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] transition-all"
                        >
                          <ArrowRightLeft size={13} />
                          Transfer
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(p)}
                          title={p.active ? "Deactivate (keeps data)" : "Reactivate"}
                          className="h-8 px-2 text-xs"
                        >
                          {p.active ? "Deactivate" : "Activate"}
                        </Button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Permanently delete this person and all their data"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--muted)] transition-all hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.role === "staff" ? "staff member" : "student"}`}
        itemName={deleteTarget?.name ?? ""}
        consequence={`All attendance records for ${deleteTarget?.name} (roll: ${deleteTarget?.rollNumber}) will be permanently erased from the database.`}
        onConfirm={() => permanentlyDelete(deleteTarget!)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Transfer Class Modal */}
      <TransferClassModal
        open={transferTarget !== null}
        person={transferTarget}
        onSuccess={() => {
          setTransferTarget(null);
          load();
        }}
        onCancel={() => setTransferTarget(null)}
      />
    </div>
  );
}
