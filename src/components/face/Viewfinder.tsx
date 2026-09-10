"use client";

import { cn } from "@/lib/utils";

type Status = "idle" | "scanning" | "success" | "error" | "already";

type FaceBox = { x: number; y: number; width: number; height: number } | null;

export function Viewfinder({
  videoRef,
  status = "idle",
  message,
  className,
  faceBox = null,
  videoSize = null,
  loading = false,
}: {
  videoRef: (el: HTMLVideoElement | null) => void;
  status?: Status;
  message?: string;
  className?: string;
  faceBox?: FaceBox;
  videoSize?: { width: number; height: number } | null;
  loading?: boolean;
}) {
  // Map detector coords (raw video) onto mirrored object-cover container
  let overlayStyle: React.CSSProperties | undefined;
  if (faceBox && videoSize && videoSize.width > 0 && videoSize.height > 0) {
    const vw = videoSize.width;
    const vh = videoSize.height;
    // Container aspect ratio is 1:1 (square)
    const cropSize = Math.min(vw, vh);
    const cropX = (vw - cropSize) / 2;
    const cropY = (vh - cropSize) / 2;

    const mirroredX = vw - faceBox.x - faceBox.width;

    const leftPercent = Math.max(0, Math.min(100, ((mirroredX - cropX) / cropSize) * 100));
    const topPercent = Math.max(0, Math.min(100, ((faceBox.y - cropY) / cropSize) * 100));
    const widthPercent = Math.min(100, (faceBox.width / cropSize) * 100);
    const heightPercent = Math.min(100, (faceBox.height / cropSize) * 100);

    overlayStyle = {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`,
    };
  }

  return (
    <div className={cn("relative mx-auto w-full max-w-md", className)}>
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-[20px] bg-[var(--ink)] shadow-[var(--shadow-lg)]",
          "ring-1 ring-black/10"
        )}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover scale-x-[-1]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        {overlayStyle ? (
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-[var(--accent-bright)] shadow-[0_0_0_9999px_rgba(0,0,0,0.25)] transition-all duration-150"
            style={overlayStyle}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-[10%] rounded-[28px] border border-white/30">
          <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-[28px] border-l-2 border-t-2 border-white/90" />
          <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-[28px] border-r-2 border-t-2 border-white/90" />
          <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-[28px] border-b-2 border-l-2 border-white/90" />
          <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-[28px] border-b-2 border-r-2 border-white/90" />
        </div>

        {status === "scanning" ? (
          <div className="pointer-events-none absolute inset-[10%] overflow-hidden rounded-[28px]">
            <div className="scan-line absolute left-0 right-0 h-0.5 bg-[var(--accent-bright)] shadow-[0_0_16px_var(--accent-bright)]" />
          </div>
        ) : null}

        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-white">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-r-transparent" />
            <p className="text-sm">Starting camera & face engine…</p>
          </div>
        ) : null}

        {status === "success" || status === "already" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/35 backdrop-blur-[2px] animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)] text-white shadow-lg animate-pop">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/35 backdrop-blur-[2px] animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)] text-white shadow-lg animate-pop">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <p
          className={cn(
            "mt-4 text-center text-sm font-medium transition-colors",
            status === "success" || status === "already"
              ? "text-[var(--success)]"
              : status === "error"
                ? "text-[var(--danger)]"
                : "text-[var(--muted)]"
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
