"use client";

import { ChangeEvent, FormEvent, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, User, CheckCircle2, ArrowLeft, Trash2, Crop } from "lucide-react";
import { Viewfinder } from "@/components/face/Viewfinder";
import { Button, Input, Label, Select, Skeleton } from "@/components/ui/primitives";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";
import {
  captureThumbnail,
  compressImageFile,
  descriptorToArray,
  useCamera,
  useFaceEngine,
} from "@/lib/face-client";

type HierarchyDept = {
  id: string;
  name: string;
  courses: Array<{
    id: string;
    name: string;
    classes: Array<{ id: string; name: string }>;
  }>;
};

export default function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { videoRef, setVideoRef, active, start, stop } = useCamera();
  const { ready, detect } = useFaceEngine();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recapture, setRecapture] = useState(false);
  const [descriptors, setDescriptors] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [personDisplayName, setPersonDisplayName] = useState("");

  // Photo Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  // Academic hierarchy
  const [hierarchy, setHierarchy] = useState<HierarchyDept[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    role: "student",
    active: true,
    thumbnail: null as string | null,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/academics/hierarchy").then((r) => r.json()),
      fetch(`/api/people/${id}`).then((r) => r.json()),
    ])
      .then(([hierarchyData, personData]) => {
        const depts: HierarchyDept[] = hierarchyData.departments || [];
        setHierarchy(depts);

        if (personData.person) {
          const p = personData.person;
          setForm({
            name: p.name,
            rollNumber: p.rollNumber,
            role: p.role,
            active: p.active,
            thumbnail: p.thumbnail,
          });

          // Match class in hierarchy if available
          let matchedDeptId = "";
          let matchedCourseId = "";
          let matchedClassId = "";

          if (p.classId) {
            for (const d of depts) {
              for (const c of d.courses) {
                const found = c.classes.find((cl) => cl.id === p.classId);
                if (found) {
                  matchedDeptId = d.id;
                  matchedCourseId = c.id;
                  matchedClassId = found.id;
                  break;
                }
              }
              if (matchedClassId) break;
            }
          }

          // Fallback by name if not matched by id
          if (!matchedClassId && p.className) {
            for (const d of depts) {
              for (const c of d.courses) {
                const found = c.classes.find((cl) => cl.name === p.className);
                if (found) {
                  matchedDeptId = d.id;
                  matchedCourseId = c.id;
                  matchedClassId = found.id;
                  break;
                }
              }
              if (matchedClassId) break;
            }
          }

          if (matchedClassId) {
            setSelectedDeptId(matchedDeptId);
            setSelectedCourseId(matchedCourseId);
            setSelectedClassId(matchedClassId);
          } else if (depts.length > 0) {
            setSelectedDeptId(depts[0].id);
            if (depts[0].courses.length > 0) {
              setSelectedCourseId(depts[0].courses[0].id);
              if (depts[0].courses[0].classes.length > 0) {
                setSelectedClassId(depts[0].courses[0].classes[0].id);
              }
            }
          }
        }
      })
      .catch(() => setError("Failed to load details"))
      .finally(() => setLoading(false));
  }, [id]);

  function onDeptChange(deptId: string) {
    setSelectedDeptId(deptId);
    const dept = hierarchy.find((d) => d.id === deptId);
    if (dept && dept.courses.length > 0) {
      setSelectedCourseId(dept.courses[0].id);
      if (dept.courses[0].classes.length > 0) {
        setSelectedClassId(dept.courses[0].classes[0].id);
      } else {
        setSelectedClassId("");
      }
    } else {
      setSelectedCourseId("");
      setSelectedClassId("");
    }
  }

  function onCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    const dept = hierarchy.find((d) => d.id === selectedDeptId);
    const course = dept?.courses.find((c) => c.id === courseId);
    if (course && course.classes.length > 0) {
      setSelectedClassId(course.classes[0].id);
    } else {
      setSelectedClassId("");
    }
  }

  useEffect(() => {
    if (!recapture) return;
    void start();
    return () => stop();
  }, [recapture, start, stop]);

  async function captureAngle() {
    if (!videoRef.current || !ready) return;
    let detection = null;
    for (let i = 0; i < 5; i++) {
      detection = await detect(videoRef.current);
      if (detection) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    if (!detection) {
      setError("No face detected");
      return;
    }
    setDescriptors((d) => [...d, descriptorToArray(detection.descriptor)].slice(0, 5));
    setForm((f) => ({
      ...f,
      thumbnail: captureThumbnail(videoRef.current!),
    }));
  }

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openCropForCurrentPhoto() {
    if (form.thumbnail) {
      setCropImageSrc(form.thumbnail);
      setIsCropperOpen(true);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const currentDept = hierarchy.find((d) => d.id === selectedDeptId);
    const currentCourse = currentDept?.courses.find((c) => c.id === selectedCourseId);
    const currentClass = currentCourse?.classes.find((cl) => cl.id === selectedClassId);

    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          classId: selectedClassId || null,
          className: currentClass?.name || undefined,
          department: currentDept?.name || undefined,
          role: form.role,
          active: form.active,
          thumbnail: form.thumbnail,
          ...(descriptors.length >= 3 ? { descriptors } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed");
        return;
      }
      router.push("/admin/people");
    } catch {
      setError("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  const currentDeptObj = hierarchy.find((d) => d.id === selectedDeptId);
  const currentCourseList = currentDeptObj?.courses || [];
  const currentCourseObj = currentCourseList.find((c) => c.id === selectedCourseId);
  const currentClassList = currentCourseObj?.classes || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-rise">
      <div>
        <Link
          href="/admin/people"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={15} /> Back to People
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Edit profile
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Update personal information, academic class, reference photo, or face data
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div>
          <Label>Full name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Roll number</Label>
          <Input value={form.rollNumber} disabled />
        </div>

        {/* Academic Assignment Cascading Selectors */}
        <div className="space-y-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3.5">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Academic Assignment
          </p>

          <div>
            <Label htmlFor="dept">Department</Label>
            <Select
              id="dept"
              value={selectedDeptId}
              onChange={(e) => onDeptChange(e.target.value)}
              required
            >
              {hierarchy.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="course">Course</Label>
              <Select
                id="course"
                value={selectedCourseId}
                onChange={(e) => onCourseChange(e.target.value)}
                required
              >
                {currentCourseList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class</Label>
              <Select
                id="class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
              >
                {currentClassList.length === 0 ? (
                  <option value="">No classes in this course</option>
                ) : (
                  currentClassList.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Role</Label>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.active ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        {/* Reference Photo Management */}
        <div className="rounded-[10px] border border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-[var(--ink)]">Reference Photo</p>
              <p className="text-xs text-[var(--muted)]">
                Compressed display thumbnail (~3-5 KB). Never used in recognition model.
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--border)] transition-colors">
                <Upload size={13} /> Upload photo
              </span>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {form.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.thumbnail}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border-2 border-[var(--accent)] shadow-xs"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]">
                  <User size={24} />
                </div>
              )}
              <div className="text-xs text-[var(--muted)]">
                {form.thumbnail ? (
                  <span className="flex items-center gap-1 text-[var(--success)] font-medium">
                    <CheckCircle2 size={14} /> Photo attached
                  </span>
                ) : (
                  <span>No reference photo on file</span>
                )}
              </div>
            </div>

            {form.thumbnail && (
              <button
                type="button"
                onClick={openCropForCurrentPhoto}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
                title="Crop, zoom or center profile photo"
              >
                <Crop size={13} />
                <span>Crop / Zoom</span>
              </button>
            )}
          </div>
        </div>

        {/* Face Re-capture */}
        <div className="rounded-[10px] border border-[var(--border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm text-[var(--ink)]">Face scan data</p>
              <p className="text-xs text-[var(--muted)]">
                Re-capture only if camera recognition starts failing
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRecapture((v) => !v)}
            >
              {recapture ? "Hide camera" : "Re-capture scan"}
            </Button>
          </div>
          {recapture ? (
            <div className="mt-4">
              <Viewfinder
                videoRef={setVideoRef}
                status="idle"
                message={`Captured ${descriptors.length} / 5`}
                loading={!active || !ready}
              />
              <Button
                type="button"
                className="mt-3"
                size="sm"
                onClick={captureAngle}
                disabled={descriptors.length >= 5}
              >
                Capture angle
              </Button>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/8 transition-all"
          >
            <Trash2 size={15} />
            Delete permanently
          </button>
        </div>
      </form>

      <ConfirmDeleteModal
        open={showDeleteModal}
        title="Delete person permanently"
        itemName={personDisplayName || form.name}
        consequence="All face scan data, attendance records, and profile information for this person will be permanently erased from the database."
        onConfirm={async () => {
          const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || "Delete failed");
          }
          setShowDeleteModal(false);
          router.push("/admin/people");
          router.refresh();
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Interactive Photo Crop & Zoom Modal */}
      <PhotoCropModal
        open={isCropperOpen}
        imageSrc={cropImageSrc}
        onSave={(cropped) => {
          setForm((f) => ({ ...f, thumbnail: cropped }));
          setIsCropperOpen(false);
        }}
        onCancel={() => setIsCropperOpen(false)}
      />
    </div>
  );
}
