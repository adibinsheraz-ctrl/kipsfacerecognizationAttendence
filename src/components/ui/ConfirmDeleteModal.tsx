"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export type ConfirmDeleteProps = {
  /** Shown in the modal title, e.g. "Delete student" */
  title: string;
  /** Short description of what will be deleted, e.g. person name or class name */
  itemName: string;
  /** Extra warning text shown beneath the main message */
  consequence?: string;
  /** Whether to show the modal */
  open: boolean;
  /** Called when admin confirms deletion */
  onConfirm: () => Promise<void> | void;
  /** Called when admin cancels */
  onCancel: () => void;
};

/**
 * Premium confirmation modal for irreversible deletion actions.
 * The admin must type "DELETE" to unlock the confirm button.
 */
export function ConfirmDeleteModal({
  title,
  itemName,
  consequence,
  open,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state each time modal opens
  useEffect(() => {
    if (open) {
      setTyped("");
      setDeleting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const confirmed = typed === "DELETE";

  async function handleConfirm() {
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
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
      <div className="relative w-full max-w-md rounded-[16px] border border-[var(--danger)]/30 bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-pop">
        {/* Red accent top bar */}
        <div className="h-1.5 w-full rounded-t-[16px] bg-gradient-to-r from-[var(--danger)] to-rose-600" />

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <X size={18} />
          </button>

          {/* Warning icon + Title */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--danger)]/10">
              <AlertTriangle size={22} className="text-[var(--danger)]" />
            </div>

            <div>
              <h2
                id="delete-modal-title"
                className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                You are permanently deleting{" "}
                <span className="font-semibold text-[var(--ink)]">"{itemName}"</span>
                {". "}
                This action{" "}
                <strong className="text-[var(--danger)]">cannot be undone</strong>
                {" "}and will immediately remove all associated data from the database.
              </p>

              {consequence && (
                <div className="mt-3 rounded-[8px] border border-[var(--danger)]/20 bg-[var(--danger)]/6 px-3.5 py-2.5 text-xs text-[var(--danger)]">
                  <strong>Also deleted:</strong> {consequence}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation input */}
          <div className="mt-6">
            <label
              htmlFor="delete-confirm-input"
              className="mb-1.5 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
            >
              Type{" "}
              <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono font-bold text-[var(--danger)] tracking-normal">
                DELETE
              </span>{" "}
              to confirm
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type DELETE here…"
              autoFocus
              autoComplete="off"
              className={`h-11 w-full rounded-[10px] border px-3.5 text-sm font-mono transition-all focus:outline-none focus:ring-2 ${
                confirmed
                  ? "border-[var(--danger)] bg-[var(--danger)]/6 text-[var(--danger)] focus:ring-[var(--danger)]/30"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--muted)] focus:ring-[var(--border)]"
              }`}
            />
          </div>

          {error && (
            <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmed || deleting}
              className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                confirmed && !deleting
                  ? "bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.98]"
                  : "cursor-not-allowed bg-[var(--surface-muted)] text-[var(--muted)]"
              }`}
            >
              {deleting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <Trash2 size={15} />
              )}
              {deleting ? "Deleting…" : "Permanently Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
