"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";

type ClassOption = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  deptId: string;
  deptName: string;
};

type Props = {
  open: boolean;
  person: { id: string; name: string; className: string; department: string; classId?: string | null } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function TransferClassModal({ open, person, onSuccess, onCancel }: Props) {
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; deptId: string }[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load hierarchy once on mount
  useEffect(() => {
    fetch("/api/academics/hierarchy")
      .then((r) => r.json())
      .then((data) => {
        const deptList: { id: string; name: string }[] = [];
        const courseList: { id: string; name: string; deptId: string }[] = [];
        const classList: ClassOption[] = [];

        (data.departments || []).forEach(
          (dept: {
            id: string;
            name: string;
            courses?: Array<{
              id: string;
              name: string;
              classes?: Array<{ id: string; name: string }>;
            }>;
          }) => {
            deptList.push({ id: dept.id, name: dept.name });
            (dept.courses || []).forEach((course) => {
              courseList.push({ id: course.id, name: course.name, deptId: dept.id });
              (course.classes || []).forEach((cls) => {
                classList.push({
                  id: cls.id,
                  name: cls.name,
                  courseId: course.id,
                  courseName: course.name,
                  deptId: dept.id,
                  deptName: dept.name,
                });
              });
            });
          }
        );

        setDepts(deptList);
        setCourses(courseList);
        setAllClasses(classList);
      })
      .catch(() => {});
  }, []);

  // Reset selections when modal opens for a new person
  useEffect(() => {
    if (open && person) {
      // Pre-select person's current class hierarchy
      const current = allClasses.find((c) => c.id === person.classId);
      if (current) {
        setSelectedDeptId(current.deptId);
        setSelectedCourseId(current.courseId);
        setSelectedClassId(current.id);
      } else {
        setSelectedDeptId("");
        setSelectedCourseId("");
        setSelectedClassId("");
      }
      setDone(false);
      setError(null);
    }
  }, [open, person?.id, person?.classId, allClasses]);

  if (!open || !person) return null;

  const filteredCourses = courses.filter((c) => c.deptId === selectedDeptId);
  const filteredClasses = allClasses.filter((c) => c.courseId === selectedCourseId);

  const selectedClass = allClasses.find((c) => c.id === selectedClassId);
  const isSameClass = selectedClassId === person.classId;
  const canTransfer = selectedClassId && !isSameClass && !saving;

  async function handleTransfer() {
    if (!canTransfer) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/people/${person!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setDone(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
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
      <div className="relative w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-pop">
        {/* Accent bar */}
        <div className="h-1.5 w-full rounded-t-[16px] bg-gradient-to-r from-[var(--accent)] to-violet-500" />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <ArrowRightLeft size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h2
                id="transfer-modal-title"
                className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
              >
                Transfer to another class
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Moving{" "}
                <span className="font-semibold text-[var(--ink)]">{person.name}</span>
              </p>
            </div>
          </div>

          {/* Current class chip */}
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3.5 py-2.5">
            <span className="text-xs text-[var(--muted)]">Currently in:</span>
            <span className="text-sm font-medium text-[var(--ink)]">
              {person.className || "No class assigned"}
            </span>
            {person.department && (
              <span className="ml-auto text-xs text-[var(--muted)]">{person.department}</span>
            )}
          </div>

          {/* Cascading dropdowns */}
          <div className="mt-5 space-y-3">
            {/* Department */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedCourseId("");
                  setSelectedClassId("");
                }}
                className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
              >
                <option value="">Select department…</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedClassId("");
                }}
                disabled={!selectedDeptId || filteredCourses.length === 0}
                className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all disabled:opacity-50"
              >
                <option value="">
                  {!selectedDeptId
                    ? "Select department first"
                    : filteredCourses.length === 0
                    ? "No courses in this department"
                    : "Select course…"}
                </option>
                {filteredCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={!selectedCourseId || filteredClasses.length === 0}
                className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all disabled:opacity-50"
              >
                <option value="">
                  {!selectedCourseId
                    ? "Select course first"
                    : filteredClasses.length === 0
                    ? "No classes in this course"
                    : "Select class…"}
                </option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer preview arrow */}
          {selectedClass && !isSameClass && (
            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm animate-fade-in">
              <span className="truncate text-[var(--muted)] line-through">{person.className || "No class"}</span>
              <ArrowRightLeft size={14} className="shrink-0 text-[var(--accent)]" />
              <span className="truncate font-semibold text-[var(--accent)]">
                {selectedClass.deptName} · {selectedClass.courseName} · {selectedClass.name}
              </span>
            </div>
          )}

          {isSameClass && selectedClassId && (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              This is the current class — pick a different one to transfer.
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          )}

          {/* Success flash */}
          {done && (
            <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[var(--success)]/10 px-3.5 py-2.5 text-sm text-[var(--success)] animate-fade-in">
              <CheckCircle2 size={16} />
              Transfer complete!
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={!canTransfer}
              loading={saving}
            >
              <ArrowRightLeft size={15} />
              Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
