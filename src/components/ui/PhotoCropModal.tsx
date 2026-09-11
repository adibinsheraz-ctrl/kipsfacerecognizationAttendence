"use client";

import { useState, useRef, useEffect, useCallback, MouseEvent, TouchEvent, WheelEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move, Crop } from "lucide-react";
import { Button } from "@/components/ui/primitives";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onSave: (croppedDataUrl: string) => void;
  onCancel: () => void;
};

const VIEW_SIZE = 280; // Viewport width/height
const OUTPUT_SIZE = 256; // Final saved image dimension (square)
const CIRCLE_RADIUS = 120; // Radius of circular crop area

export function PhotoCropModal({ open, imageSrc, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load the image when imageSrc changes
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Fit image initially so the smallest dimension fills the circular crop area
      const minDimension = Math.min(img.naturalWidth, img.naturalHeight);
      const initialScale = Math.max((CIRCLE_RADIUS * 2) / minDimension, 1);
      setScale(initialScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Render main interactive canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Draw background grid/darkness
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Draw the image centered at offset
    const centerX = VIEW_SIZE / 2 + offset.x;
    const centerY = VIEW_SIZE / 2 + offset.y;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;

    ctx.drawImage(image, centerX - w / 2, centerY - h / 2, w, h);

    // Draw dark vignette overlay outside circular crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_SIZE, VIEW_SIZE);
    ctx.arc(VIEW_SIZE / 2, VIEW_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();

    // Draw circular guideline border
    ctx.beginPath();
    ctx.arc(VIEW_SIZE / 2, VIEW_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle crosshairs in center
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(VIEW_SIZE / 2 - 8, VIEW_SIZE / 2);
    ctx.lineTo(VIEW_SIZE / 2 + 8, VIEW_SIZE / 2);
    ctx.moveTo(VIEW_SIZE / 2, VIEW_SIZE / 2 - 8);
    ctx.lineTo(VIEW_SIZE / 2, VIEW_SIZE / 2 + 8);
    ctx.stroke();

    ctx.restore();
  }, [image, scale, offset]);

  // Render small live preview circle
  const drawPreviewCanvas = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview || !image) return;
    const ctx = preview.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 64);

    // Source coordinates in the main image corresponding to the circular crop area
    const scaleFactor = (CIRCLE_RADIUS * 2) / (VIEW_SIZE * scale);
    const sourceW = (CIRCLE_RADIUS * 2) / scale;
    const sourceH = (CIRCLE_RADIUS * 2) / scale;
    const sourceX = image.naturalWidth / 2 - offset.x / scale - sourceW / 2;
    const sourceY = image.naturalHeight / 2 - offset.y / scale - sourceH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, 64, 64);
    ctx.restore();
  }, [image, scale, offset]);

  useEffect(() => {
    drawMainCanvas();
    drawPreviewCanvas();
  }, [drawMainCanvas, drawPreviewCanvas]);

  // Drag handling (mouse)
  function handleMouseDown(e: MouseEvent) {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Drag handling (touch for tablet/mobile)
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStartRef.current = { ...offset };
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  }

  function handleTouchEnd() {
    setIsDragging(false);
  }

  // Mouse wheel zoom
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((s) => Math.min(Math.max(s + delta, 0.3), 4));
  }

  function handleReset() {
    if (!image) return;
    const minDimension = Math.min(image.naturalWidth, image.naturalHeight);
    const initialScale = Math.max((CIRCLE_RADIUS * 2) / minDimension, 1);
    setScale(initialScale);
    setOffset({ x: 0, y: 0 });
  }

  function handleCropConfirm() {
    if (!image) return;

    // Create offscreen canvas for final output
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Source coordinates in the image corresponding to the circular crop area
    const sourceW = (CIRCLE_RADIUS * 2) / scale;
    const sourceH = (CIRCLE_RADIUS * 2) / scale;
    const sourceX = image.naturalWidth / 2 - offset.x / scale - sourceW / 2;
    const sourceY = image.naturalHeight / 2 - offset.y / scale - sourceH / 2;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    // Export as high-quality compressed WebP (or JPEG fallback)
    const dataUrl = outputCanvas.toDataURL("image/webp", 0.85);
    onSave(dataUrl);
  }

  if (!open || !imageSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{ backdropFilter: "blur(5px)" }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-pop">
        {/* Accent Bar */}
        <div className="h-1.5 w-full rounded-t-[16px] bg-gradient-to-r from-[var(--accent)] to-cyan-500" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Crop size={18} className="text-[var(--accent)]" />
              <h2 id="photo-editor-title" className="text-base font-semibold text-[var(--ink)]">
                Adjust Profile Photo
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Drag to center face • Zoom in or out • Position inside the circle
          </p>

          {/* Interactive Crop Viewport */}
          <div className="mt-3 flex flex-col items-center">
            <div
              className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-black cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
            >
              <canvas
                ref={canvasRef}
                width={VIEW_SIZE}
                height={VIEW_SIZE}
                className="block"
              />
              <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-xs flex items-center gap-1">
                <Move size={10} /> Drag to position
              </div>
            </div>

            {/* Controls Bar */}
            <div className="mt-4 flex w-full items-center justify-between gap-3">
              {/* Zoom Buttons & Slider */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-1.5 text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>

                <input
                  type="range"
                  min="0.4"
                  max="3.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
                  title="Zoom"
                />

                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(s + 0.1, 4))}
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-1.5 text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              {/* Reset / Center */}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                title="Reset to center"
              >
                <RotateCcw size={12} />
                Center
              </button>

              {/* Live circular preview */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
                <canvas
                  ref={previewCanvasRef}
                  width={64}
                  height={64}
                  className="h-9 w-9 rounded-full border-2 border-[var(--accent)] shadow-xs"
                  title="Live Profile Preview"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleCropConfirm}>
              <Check size={14} />
              Apply & Save Photo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
