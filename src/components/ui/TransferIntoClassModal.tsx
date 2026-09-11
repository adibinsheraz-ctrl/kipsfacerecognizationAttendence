"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Search, X, Loader2, CheckCircle2, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/primitives";

type PersonResult = {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  className: string;
  classId?: string | null;
  role: string;
  thumbnail: string | null;
};

type Props = {
  open: boolean;
  targetClass: {
    id: string;
    name: string;
    courseName?: string;
    deptName?: string;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function TransferIntoClassModal({ open, targetClass, onSuccess, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferredName, setTransferredName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial candidates or search query
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTransferredName(null);
    setError(null);
    loadStudents("");
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      loadStudents(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  async function loadStudents(q: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      setResults(data.people || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer(person: PersonResult) {
    if (!targetClass) return;
    setTransferringId(person.id);
    setError(null);

    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: targetClass.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer student");

      setTransferredName(person.name);
      // Reload results to reflect the update
      loadStudents(query);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
      setTransferringId(null);
    }
  }

  if (!open || !targetClass) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-into-class-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: "blur(4px)" }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-pop">
        {/* Accent Bar */}
        <div className="h-1.5 w-full rounded-t-[16px] bg-gradient-to-r from-[var(--accent)] to-teal-500" />

        <div className="p-6 pb-3">
          {/* Close */}
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2
                id="transfer-into-class-title"
                className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
              >
                Transfer Student into {targetClass.name}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {targetClass.deptName ? `${targetClass.deptName} • ` : ""}
                {targetClass.courseName ? `Course: ${targetClass.courseName}` : ""}
              </p>
            </div>
          </div>

          {/* Success flash */}
          {transferredName && (
            <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[var(--success)]/10 px-3.5 py-2.5 text-xs font-medium text-[var(--success)] animate-fade-in">
              <CheckCircle2 size={16} />
              <span>
                <strong>{transferredName}</strong> was successfully transferred to{" "}
                <strong>{targetClass.name}</strong>!
              </span>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-[10px] bg-[var(--danger)]/10 px-3.5 py-2 text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          {/* Search bar */}
          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--muted)]">
              {loading ? (
                <Loader2 size={15} className="animate-spin text-[var(--accent)]" />
              ) : (
                <Search size={15} />
              )}
            </div>
            <input
              type="text"
              placeholder="Search student by name, roll number (e.g. adi, bin)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]/40 pl-9 pr-9 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] transition-all focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="space-y-2">
            {results.length === 0 && !loading ? (
              <p className="py-8 text-center text-xs text-[var(--muted)]">
                {query ? `No students found matching "${query}"` : "No enrolled students found"}
              </p>
            ) : (
              results.map((person) => {
                const isAlreadyIn = person.classId === targetClass.id;
                const isTransferring = transferringId === person.id;

                return (
                  <div
                    key={person.id}
                    className={`flex items-center justify-between rounded-[10px] border p-2.5 transition-colors ${
                      isAlreadyIn
                        ? "border-[var(--border)] bg-[var(--surface-muted)]/40 opacity-70"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-muted)]/20"
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-2.5">
                      {person.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.thumbnail}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover border border-[var(--border)]"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                          {person.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[var(--ink)]">{person.name}</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          Roll: <span className="font-mono">{person.rollNumber}</span> •{" "}
                          {isAlreadyIn ? (
                            <span className="font-medium text-[var(--success)]">Already enrolled here</span>
                          ) : (
                            <span>Currently: {person.className || "Unassigned"}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      {isAlreadyIn ? (
                        <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTransfer(person)}
                          disabled={isTransferring}
                          className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white shadow-2xs hover:bg-[var(--accent-hover)] active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {isTransferring ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ArrowRightLeft size={12} />
                          )}
                          {isTransferring ? "Moving…" : "Transfer In"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3">
          <p className="text-[11px] text-[var(--muted)]">
            Transfers update the database and roster immediately.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
