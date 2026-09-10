"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Viewfinder } from "@/components/face/Viewfinder";
import { Button } from "@/components/ui/primitives";
import { DeveloperCredits } from "@/components/DeveloperCredits";
import {
  createLivenessTracker,
  descriptorToArray,
  useCamera,
  useFaceEngine,
} from "@/lib/face-client";

type Status = "idle" | "scanning" | "success" | "error" | "already";

type ResultPerson = {
  name: string;
  rollNumber: string;
  department: string;
  className: string;
  thumbnail: string | null;
};

export default function KioskPage() {
  const { videoRef, setVideoRef, active, error: camError, start, stop } =
    useCamera("user");
  const { ready, error: modelError, detect } = useFaceEngine();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Look at the camera. Usually under 3 seconds");
  const [person, setPerson] = useState<ResultPerson | null>(null);
  const [faceBox, setFaceBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(
    null
  );

  const busyRef = useRef(false);
  const cooldownRef = useRef(false);
  const livenessRef = useRef(createLivenessTracker(1));
  const loopRef = useRef<number | null>(null);
  const statusRef = useRef<Status>("idle");
  const missStreakRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    if (!ready || !active) return;
    let cancelled = false;

    const finishCycle = (delay = 2000) => {
      window.setTimeout(() => {
        busyRef.current = false;
        cooldownRef.current = false;
        livenessRef.current.reset();
        missStreakRef.current = 0;
        setFaceBox(null);
        setStatus("idle");
        setMessage("Look at the camera. Usually under 3 seconds");
        setPerson(null);
      }, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;

      if (cooldownRef.current || busyRef.current || !video || video.readyState < 2) {
        loopRef.current = window.setTimeout(tick, 100);
        return;
      }

      setVideoSize({ width: video.videoWidth, height: video.videoHeight });

      const detection = await detect(video);
      if (cancelled) return;

      if (!detection) {
        missStreakRef.current += 1;
        // Ignore brief flickers so blink progress isn't wiped
        if (missStreakRef.current >= 4) {
          setFaceBox(null);
          livenessRef.current.reset();
          if (
            statusRef.current !== "success" &&
            statusRef.current !== "already" &&
            statusRef.current !== "error"
          ) {
            setStatus("idle");
            setMessage("Center your face in the frame");
          }
        }
        loopRef.current = window.setTimeout(tick, 80);
        return;
      }

      missStreakRef.current = 0;
      setFaceBox(detection.box);

      const live = livenessRef.current.update(detection.landmarks);

      if (
        statusRef.current !== "success" &&
        statusRef.current !== "already" &&
        statusRef.current !== "error"
      ) {
        setStatus("scanning");
        setMessage(live.passed ? "Matching…" : live.prompt);
      }

      if (!live.passed) {
        loopRef.current = window.setTimeout(tick, 60);
        return;
      }

      cooldownRef.current = true;
      busyRef.current = true;
      setMessage("Matching…");

      try {
        const res = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descriptor: descriptorToArray(detection.descriptor),
            livenessPassed: true,
          }),
        });
        const data = await res.json();

        if (data.matched) {
          setPerson(data.person);
          setStatus(data.alreadyMarked ? "already" : "success");
          setMessage(data.message);
        } else {
          setPerson(null);
          setStatus("error");
          setMessage(data.message || "Face not recognized. Try again.");
        }
      } catch {
        setStatus("error");
        setMessage("Could not reach the server. Try again.");
      }

      finishCycle(2000);
      loopRef.current = window.setTimeout(tick, 250);
    };

    loopRef.current = window.setTimeout(tick, 150);
    return () => {
      cancelled = true;
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [ready, active, detect, videoRef]);

  const booting = !ready || !active;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              Kips College G-9
            </p>
            <p className="text-sm text-[var(--muted)]">Attendance kiosk, under 3s</p>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            Home
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <Viewfinder
            videoRef={setVideoRef}
            status={status}
            message={camError || modelError || message}
            faceBox={faceBox}
            videoSize={videoSize}
            loading={booting}
          />

          {person ? (
            <div className="mt-6 flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)] animate-pop">
              {person.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.thumbnail}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                  {person.name.slice(0, 1)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--ink)]">{person.name}</p>
                  {status === "already" ? (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
                      Already Scanned
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                      Marked Present
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {person.rollNumber}, {person.className}
                </p>
              </div>
            </div>
          ) : null}

          {(camError || modelError) && (
            <Button className="mt-6" onClick={() => void start()}>
              Retry camera
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          Face only. Blink once. Photos and phone screens are blocked.
        </p>
        <div className="mt-4 flex justify-center">
          <DeveloperCredits compact />
        </div>
      </div>
    </div>
  );
}
