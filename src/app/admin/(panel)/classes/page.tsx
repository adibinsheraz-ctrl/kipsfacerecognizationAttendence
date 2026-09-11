"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  FolderPlus,
  BookOpen,
  GraduationCap,
  Users,
  Edit2,
  Trash2,
  ChevronRight,
  Plus,
  ArrowRight,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import { Button, Card, EmptyState, Input, Label, Skeleton } from "@/components/ui/primitives";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { TransferIntoClassModal } from "@/components/ui/TransferIntoClassModal";

type ClassItem = {
  id: string;
  name: string;
  _count?: { people: number };
};

type CourseItem = {
  id: string;
  name: string;
  classes: ClassItem[];
};

type DepartmentItem = {
  id: string;
  name: string;
  courses: CourseItem[];
};

export default function ClassesManagementPage() {
  const [departments, setDepartments] = useState<DepartmentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Action states
  const [activeModal, setActiveModal] = useState<{
    type: "addDept" | "editDept" | "addCourse" | "editCourse" | "addClass" | "editClass";
    id?: string;
    parentId?: string;
    currentName?: string;
  } | null>(null);

  const [inputName, setInputName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "dept" | "course" | "class";
    id: string;
    name: string;
    consequence: string;
  } | null>(null);

  // Transfer into class modal state
  const [transferTargetClass, setTransferTargetClass] = useState<{
    id: string;
    name: string;
    courseName?: string;
    deptName?: string;
  } | null>(null);

  async function loadHierarchy() {
    try {
      setLoading(true);
      const res = await fetch("/api/academics/hierarchy");
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setError(data.error || "Failed to load academic hierarchy");
      }
    } catch {
      setError("Network error while loading academic structure");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHierarchy();
  }, []);

  function openModal(
    type: "addDept" | "editDept" | "addCourse" | "editCourse" | "addClass" | "editClass",
    id?: string,
    parentId?: string,
    currentName?: string
  ) {
    setActiveModal({ type, id, parentId, currentName });
    setInputName(currentName || "");
    setError(null);
  }

  function closeModal() {
    setActiveModal(null);
    setInputName("");
    setError(null);
  }

  async function handleModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeModal || !inputName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      let res: Response | null = null;

      if (activeModal.type === "addDept") {
        res = await fetch("/api/academics/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim() }),
        });
      } else if (activeModal.type === "editDept") {
        res = await fetch(`/api/academics/departments/${activeModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim() }),
        });
      } else if (activeModal.type === "addCourse") {
        res = await fetch("/api/academics/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId: activeModal.parentId,
            name: inputName.trim(),
          }),
        });
      } else if (activeModal.type === "editCourse") {
        res = await fetch(`/api/academics/courses/${activeModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim() }),
        });
      } else if (activeModal.type === "addClass") {
        res = await fetch("/api/academics/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: activeModal.parentId,
            name: inputName.trim(),
          }),
        });
      } else if (activeModal.type === "editClass") {
        res = await fetch(`/api/academics/classes/${activeModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputName.trim() }),
        });
      }

      if (res && !res.ok) {
        const d = await res.json();
        setError(d.error || "Operation failed");
        return;
      }

      closeModal();
      loadHierarchy();
    } catch {
      setError("Server request failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(
    type: "dept" | "course" | "class",
    id: string,
    name: string
  ) {
    const consequence =
      type === "dept"
        ? `All courses and classes under "${name}" will also be permanently deleted.`
        : type === "course"
        ? `All classes under "${name}" will also be permanently deleted.`
        : `All students enrolled in "${name}" will be unlinked (their profiles remain).`;

    setDeleteTarget({ type, id, name, consequence });
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    let endpoint = "";
    if (type === "dept") endpoint = `/api/academics/departments/${id}`;
    if (type === "course") endpoint = `/api/academics/courses/${id}`;
    if (type === "class") endpoint = `/api/academics/classes/${id}`;

    const res = await fetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to delete item");
    }
    setDeleteTarget(null);
    loadHierarchy();
  }


  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Departments & Classes
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage academic structure: Department → Course → Class
          </p>
        </div>
        <Button onClick={() => openModal("addDept")}>
          <FolderPlus size={18} />
          Add Department
        </Button>
      </div>

      {error ? (
        <div className="rounded-[10px] bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : !departments || departments.length === 0 ? (
        <Card>
          <EmptyState
            title="No academic departments configured"
            description="Create your first department (e.g. Computer Science, Science, Commerce) to organize courses and classes."
            action={
              <Button onClick={() => openModal("addDept")}>
                <Plus size={16} />
                Create first department
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {departments.map((dept) => (
            <Card key={dept.id} className="overflow-hidden border-[var(--border)]">
              {/* Department Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/50 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
                      {dept.name}
                    </h2>
                    <p className="text-xs text-[var(--muted)]">
                      {dept.courses.length} course{dept.courses.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openModal("addCourse", undefined, dept.id)}
                  >
                    <Plus size={15} />
                    Add Course
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openModal("editDept", dept.id, undefined, dept.name)}
                  >
                    <Edit2 size={14} />
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
                    onClick={() => handleDelete("dept", dept.id, dept.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Courses & Classes Content */}
              <div className="p-5">
                {dept.courses.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                    <p>No courses added yet in {dept.name}.</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => openModal("addCourse", undefined, dept.id)}
                    >
                      <Plus size={14} />
                      Add first course (e.g. ICS, BSc, FA)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dept.courses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)]/50 p-4 transition-all"
                      >
                        {/* Course header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]/60">
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-[var(--accent)]" />
                            <h3 className="font-semibold text-sm text-[var(--ink)]">
                              Course: {course.name}
                            </h3>
                            <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)] border border-[var(--border)]">
                              {course.classes.length} class{course.classes.length === 1 ? "" : "es"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => openModal("addClass", undefined, course.id)}
                            >
                              <Plus size={13} />
                              Add Class
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                openModal("editCourse", course.id, dept.id, course.name)
                              }
                              title="Rename Course"
                            >
                              <Edit2 size={13} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                              onClick={() => handleDelete("course", course.id, course.name)}
                              title="Delete Course"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>

                        {/* Classes Grid */}
                        <div className="mt-3.5">
                          {course.classes.length === 0 ? (
                            <p className="text-xs text-[var(--muted)] italic">
                              No classes in this course yet. Click &ldquo;Add Class&rdquo; (e.g. RCSB1, RCSB2).
                            </p>
                          ) : (
                            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                              {course.classes.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="group relative flex flex-col justify-between rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-sm)] hover:border-[var(--accent)] transition-all"
                                >
                                  <div>
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-1.5 font-medium text-sm text-[var(--ink)]">
                                        <GraduationCap size={16} className="text-[var(--accent)]" />
                                        <span>{cls.name}</span>
                                      </div>
                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() =>
                                            openModal("editClass", cls.id, course.id, cls.name)
                                          }
                                          className="p-1 text-[var(--muted)] hover:text-[var(--ink)]"
                                          title="Rename"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete("class", cls.id, cls.name)}
                                          className="p-1 text-[var(--danger)] hover:opacity-80"
                                          title="Delete"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                                      <Users size={13} />
                                      <span>{cls._count?.people || 0} students</span>
                                    </div>
                                  </div>

                                  <div className="mt-3.5 flex items-center gap-1.5">
                                    <Link
                                      href={`/admin/classes/${cls.id}`}
                                      className="flex-1 flex items-center justify-between rounded-[6px] bg-[var(--surface-muted)]/60 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                                    >
                                      <span>Details</span>
                                      <ArrowRight size={13} />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setTransferTargetClass({
                                          id: cls.id,
                                          name: cls.name,
                                          courseName: course.name,
                                          deptName: dept.name,
                                        })
                                      }
                                      title={`Transfer student directly into ${cls.name}`}
                                      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 px-2 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                                    >
                                      <ArrowRightLeft size={12} />
                                      <span>Transfer In</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] animate-pop">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
              {activeModal.type === "addDept" && "Add Department"}
              {activeModal.type === "editDept" && "Rename Department"}
              {activeModal.type === "addCourse" && "Add Course"}
              {activeModal.type === "editCourse" && "Rename Course"}
              {activeModal.type === "addClass" && "Add Class"}
              {activeModal.type === "editClass" && "Rename Class"}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {activeModal.type.includes("Dept") && "e.g. Computer Science, Science, Commerce"}
              {activeModal.type.includes("Course") && "e.g. ICS, BSc, FA, FSc Pre-Medical"}
              {activeModal.type.includes("Class") && "e.g. RCSB1, RCSB2, RCSB3, BSCS-1"}
            </p>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="itemName">Name</Label>
                <Input
                  id="itemName"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Enter name…"
                  autoFocus
                  required
                />
              </div>

              {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "dept"
            ? "Delete department"
            : deleteTarget?.type === "course"
            ? "Delete course"
            : "Delete class"
        }
        itemName={deleteTarget?.name ?? ""}
        consequence={deleteTarget?.consequence}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Transfer Into Class Modal */}
      <TransferIntoClassModal
        open={transferTargetClass !== null}
        targetClass={transferTargetClass}
        onSuccess={() => {
          setTransferTargetClass(null);
          loadHierarchy();
        }}
        onCancel={() => setTransferTargetClass(null)}
      />
    </div>
  );
}
