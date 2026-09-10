"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Viewfinder } from "@/components/face/Viewfinder";
import { Button, Input, Label, Select, Skeleton } from "@/components/ui/primitives";
import {
  captureThumbnail,
  descriptorToArray,
  useCamera,
  useFaceEngine,
} from "@/lib/face-client";

export default function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { videoRef, setVideoRef, active, start, stop } = useCamera();
  const { ready, detect } = useFaceEngine();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recapture, setRecapture] = useState(false);
  const [descriptors, setDescriptors] = useState<number[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    department: "",
    className: "",
    role: "student",
    active: true,
    thumbnail: null as string | null,
  });

  useEffect(() => {
    fetch(`/api/people/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.person) {
          setForm({
            name: data.person.name,
            rollNumber: data.person.rollNumber,
            department: data.person.department,
            className: data.person.className,
            role: data.person.role,
            active: data.person.active,
            thumbnail: data.person.thumbnail,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          department: form.department,
          className: form.className,
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
        <Link href="/admin/people" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← People
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Edit person
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div>
          <Label>Full name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Roll number</Label>
          <Input value={form.rollNumber} disabled />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <Label>Class</Label>
            <Input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
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

        <div className="rounded-[10px] border border-[var(--border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Face data</p>
              <p className="text-sm text-[var(--muted)]">
                Re-capture if matching starts failing
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setRecapture((v) => !v)}>
              {recapture ? "Hide camera" : "Re-capture"}
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
              <Button type="button" className="mt-3" onClick={captureAngle} disabled={descriptors.length >= 5}>
                Capture angle
              </Button>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
