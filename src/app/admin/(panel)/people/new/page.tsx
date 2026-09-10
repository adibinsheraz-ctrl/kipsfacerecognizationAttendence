"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Viewfinder } from "@/components/face/Viewfinder";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import {
  captureThumbnail,
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
  const [faceBox, setFaceBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    department: "Computer Science",
    className: "BS-CS",
    role: "student",
  });

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
      // Retry a few times quickly — enrollment should feel instant
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (descriptors.length < 3) {
      setError("Capture at least 3 face angles before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
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
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="roll">Roll / ID number</Label>
            <Input
              id="roll"
              value={form.rollNumber}
              onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dept">Department</Label>
              <Input
                id="dept"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                required
              />
            </div>
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

          <Button type="submit" className="w-full" loading={saving} disabled={!enough}>
            Save enrollment
          </Button>
          {!enough ? (
            <p className="text-center text-xs text-[var(--muted)]">
              Capture at least 3 angles to enable save
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
