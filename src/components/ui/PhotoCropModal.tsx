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
  // Base scale is computed on load so the full image is comfortably visible and slightly zoomed out
  const [baseScale, setBaseScale] = useState(1);
  // Zoom factor multiplier relative to baseScale (1.0 = full-context view)
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image and compute baseline scale
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Fit the image so that the largest dimension comfortably fits within ~88% of the circle diameter
      // This ensures the photo is slightly zoomed out on initial load, keeping its original aspect ratio
      // and allowing the admin to see the full context (head, shoulders, background) before adjusting.
      const maxDimension = Math.max(img.naturalWidth, img.naturalHeight);
      const targetSize = CIRCLE_RADIUS * 2 * 0.88;
      const initialBase = targetSize / maxDimension;
      setBaseScale(initialBase);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Current effective scale
  const currentScale = baseScale * zoom;

  // Render main interactive canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Dark canvas background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Draw the image centered with offset
    const centerX = VIEW_SIZE / 2 + offset.x;
    const centerY = VIEW_SIZE / 2 + offset.y;
    const w = image.naturalWidth * currentScale;
    const h = image.naturalHeight * currentScale;

    ctx.drawImage(image, centerX - w / 2, centerY - h / 2, w, h);

    // Draw translucent vignette overlay outside circular crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_SIZE, VIEW_SIZE);
    ctx.arc(VIEW_SIZE / 2, VIEW_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();

    // Circular guideline border
    ctx.beginPath();
    ctx.arc(VIEW_SIZE / 2, VIEW_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center alignment crosshairs
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(VIEW_SIZE / 2 - 8, VIEW_SIZE / 2);
    ctx.lineTo(VIEW_SIZE / 2 + 8, VIEW_SIZE / 2);
    ctx.moveTo(VIEW_SIZE / 2, VIEW_SIZE / 2 - 8);
    ctx.lineTo(VIEW_SIZE / 2, VIEW_SIZE / 2 + 8);
    ctx.stroke();

    ctx.restore();
  }, [image, currentScale, offset]);

  // Render live circular preview
  const drawPreviewCanvas = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview || !image) return;
    const ctx = preview.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 64);

    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.clip();

    // Scale factor from circular viewport to 64px preview
    const previewFactor = 64 / (CIRCLE_RADIUS * 2);
    ctx.translate(32, 32);
    ctx.translate(offset.x * previewFactor, offset.y * previewFactor);

    const renderW = image.naturalWidth * currentScale * previewFactor;
    const renderH = image.naturalHeight * currentScale * previewFactor;
    ctx.drawImage(image, -renderW / 2, -renderH / 2, renderW, renderH);

    ctx.restore();
  }, [image, currentScale, offset]);

  useEffect(() => {
    drawMainCanvas();
    drawPreviewCanvas();
  }, [drawMainCanvas, drawPreviewCanvas]);

  // Mouse drag handling
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

  // Touch drag handling (tablet / mobile)
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
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 3.5));
  }

  // Reset to initial full-context view
  function handleReset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleCropConfirm() {
    if (!image) return;

    // Create high-res offscreen canvas for final export
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Clean neutral background in case image is smaller than crop
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Scale factor from CIRCLE_RADIUS*2 (240px) to OUTPUT_SIZE (256px)
    const outputFactor = OUTPUT_SIZE / (CIRCLE_RADIUS * 2);

    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    ctx.translate(offset.x * outputFactor, offset.y * outputFactor);

    const renderW = image.naturalWidth * currentScale * outputFactor;
    const renderH = image.naturalHeight * currentScale * outputFactor;
    ctx.drawImage(image, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.restore();

    // Export as high-efficiency WebP (with fallback)
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
            Full photo is shown slightly zoomed out for context • Drag to center • Zoom in/out to adjust
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
                <Move size={10} /> Drag to center face
              </div>
            </div>

            {/* Controls Bar */}
            <div className="mt-4 flex w-full items-center justify-between gap-3">
              {/* Zoom Buttons & Slider */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-1.5 text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>

                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
                  title={`Zoom: ${Math.round(zoom * 100)}%`}
                />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.1, 3.5))}
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
                title="Reset zoom & center"
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
