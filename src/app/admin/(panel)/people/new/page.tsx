"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Camera, CheckCircle2, User, Crop } from "lucide-react";
import { Viewfinder } from "@/components/face/Viewfinder";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";
import {
  captureThumbnail,
  compressImageFile,
  descriptorToArray,
  useCamera,
  useFaceEngine,
} from "@/lib/face-client";

const ANGLES = [
  "Look straight at the camera",
  "Turn slightly left",
  "Turn slightly right",
  "Tilt chin up a little",
  "Neutral face, good lighting",
];

type HierarchyDept = {
  id: string;
  name: string;
  courses: Array<{
    id: string;
    name: string;
    classes: Array<{ id: string; name: string }>;
  }>;
};

export default function EnrollPersonPage() {
  const router = useRouter();
  const { videoRef, setVideoRef, active, error: camError, start, stop } = useCamera();
  const { ready, error: modelError, detect } = useFaceEngine();
  const [step, setStep] = useState(0);
  const [descriptors, setDescriptors] = useState<number[][]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [faceBox, setFaceBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Hierarchy selection state
  const [hierarchy, setHierarchy] = useState<HierarchyDept[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    role: "student",
  });

  // Load academic hierarchy for dropdowns
  useEffect(() => {
    fetch("/api/academics/hierarchy")
      .then((r) => r.json())
      .then((d) => {
        if (d.departments && d.departments.length > 0) {
          setHierarchy(d.departments);
          const firstDept = d.departments[0];
          setSelectedDeptId(firstDept.id);
          if (firstDept.courses.length > 0) {
            const firstCourse = firstDept.courses[0];
            setSelectedCourseId(firstCourse.id);
            if (firstCourse.classes.length > 0) {
              setSelectedClassId(firstCourse.classes[0].id);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Sync course when dept changes
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

  // Sync class when course changes
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
    void start();
    return () => stop();
  }, [start, stop]);

  // Live face guide while enrolling
  useEffect(() => {
    if (!ready || !active) return;
    let cancelled = false;
    let timer: number;
    const loop = async () => {
      if (cancelled || !videoRef.current) {
        timer = window.setTimeout(loop, 200);
        return;
      }
      const d = await detect(videoRef.current);
      if (!cancelled) setFaceBox(d?.box ?? null);
      timer = window.setTimeout(loop, 180);
    };
    timer = window.setTimeout(loop, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, active, detect, videoRef]);

  async function captureAngle() {
    if (!videoRef.current || !ready) return;
    setCapturing(true);
    setError(null);
    try {
      let detection = null;
      for (let i = 0; i < 5; i++) {
        detection = await detect(videoRef.current);
        if (detection) break;
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!detection) {
        setError("No face detected. Center your face in good light and try again.");
        return;
      }
      const next = [...descriptors, descriptorToArray(detection.descriptor)];
      setDescriptors(next);
      if (!thumbnail) setThumbnail(captureThumbnail(videoRef.current));
      setStep((s) => Math.min(s + 1, ANGLES.length - 1));
    } finally {
      setCapturing(false);
    }
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
    if (thumbnail) {
      setCropImageSrc(thumbnail);
      setIsCropperOpen(true);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (descriptors.length < 3) {
      setError("Capture at least 3 face angles before saving.");
      return;
    }
    if (!selectedClassId) {
      setError("Please select a valid class for this person.");
      return;
    }

    setSaving(true);
    setError(null);

    const currentDept = hierarchy.find((d) => d.id === selectedDeptId);
    const currentCourse = currentDept?.courses.find((c) => c.id === selectedCourseId);
    const currentClass = currentCourse?.classes.find((cl) => cl.id === selectedClassId);

    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          rollNumber: form.rollNumber,
          role: form.role,
          classId: selectedClassId,
          className: currentClass?.name || "",
          department: currentDept?.name || "",
          thumbnail,
          descriptors,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enrollment failed");
        return;
      }
      router.push("/admin/people");
      router.refresh();
    } catch {
      setError("Could not save enrollment");
    } finally {
      setSaving(false);
    }
  }

  const enough = descriptors.length >= 3;
  const currentDeptObj = hierarchy.find((d) => d.id === selectedDeptId);
  const currentCourseList = currentDeptObj?.courses || [];
  const currentCourseObj = currentCourseList.find((c) => c.id === selectedCourseId);
  const currentClassList = currentCourseObj?.classes || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-rise">
      <div>
        <Link href="/admin/people" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← People
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Enroll person
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Capture 3 to 5 angles. We store encrypted face embeddings, not raw gallery photos.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Camera & Vector Scanning View */}
        <div>
          <Viewfinder
            videoRef={setVideoRef}
            status={capturing ? "scanning" : faceBox ? "scanning" : "idle"}
            message={
              camError ||
              modelError ||
              (faceBox
                ? ANGLES[Math.min(step, ANGLES.length - 1)]
                : "Center your face. The box means you are ready")
            }
            faceBox={faceBox}
            videoSize={
              videoRef.current && videoRef.current.videoWidth
                ? {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                  }
                : null
            }
            loading={!ready || !active}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              Captured <span className="font-medium text-[var(--ink)]">{descriptors.length}</span> / 5
            </p>
            <Button
              onClick={captureAngle}
              loading={capturing}
              disabled={!ready || descriptors.length >= 5}
            >
              Capture angle
            </Button>
          </div>

          <div className="mt-3 flex gap-1.5">
            {ANGLES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < descriptors.length ? "bg-[var(--accent)]" : "bg-[var(--surface-muted)]"
                }`}
              />
            ))}
          </div>

          {/* Reference Photo Box */}
          <div className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">
                  Reference Photo (Display-only)
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Compressed thumbnail (~3-5 KB). Never used in face recognition matching.
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 px-2.5 py-1 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors">
                  <Upload size={13} />
                  Upload
                </span>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt="Reference thumbnail"
                    className="h-14 w-14 rounded-full object-cover border-2 border-[var(--accent)] shadow-xs"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]">
                    <User size={24} />
                  </div>
                )}
                <div className="text-xs text-[var(--muted)]">
                  {thumbnail ? (
                    <span className="flex items-center gap-1 text-[var(--success)] font-medium">
                      <CheckCircle2 size={14} /> Photo ready
                    </span>
                  ) : (
                    <span>Will be snapped upon first face capture</span>
                  )}
                </div>
              </div>

              {thumbnail && (
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
        </div>

        {/* Enrollment Form */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
        >
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Muhammad Ali"
              required
            />
          </div>
          <div>
            <Label htmlFor="roll">Roll / ID number</Label>
            <Input
              id="roll"
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              placeholder="e.g. 2026-CS-042"
              required
            />
          </div>

          {/* Academic Structure Cascading Dropdowns */}
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

            {currentClassList.length === 0 ? (
              <p className="text-xs text-[var(--warning)]">
                Please add classes to this course under Classes & Depts first.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </Select>
          </div>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <Button
            type="submit"
            className="w-full"
            loading={saving}
            disabled={!enough || !selectedClassId}
          >
            Save enrollment
          </Button>
          {!enough ? (
            <p className="text-center text-xs text-[var(--muted)]">
              Capture at least 3 angles to enable save
            </p>
          ) : null}
        </form>
      </div>

      {/* Interactive Photo Crop & Zoom Modal */}
      <PhotoCropModal
        open={isCropperOpen}
        imageSrc={cropImageSrc}
        onSave={(cropped) => {
          setThumbnail(cropped);
          setIsCropperOpen(false);
        }}
        onCancel={() => setIsCropperOpen(false)}
      />
    </div>
  );
}
