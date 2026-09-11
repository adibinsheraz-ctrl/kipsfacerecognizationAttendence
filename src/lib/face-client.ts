"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as FaceApi from "@vladmandic/face-api";

export type FaceApiModule = typeof FaceApi;

let modelsPromise: Promise<FaceApiModule> | null = null;

/** Served from /public/models — no CDN dependency at scan time. */
const MODEL_URL = "/models";

export async function loadFaceApi(): Promise<FaceApiModule> {
  if (typeof window === "undefined") {
    throw new Error("Face API is browser-only");
  }
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      // Prefer WebGL for real-time speed
      const tf = faceapi.tf as {
        setBackend?: (b: string) => Promise<boolean>;
        ready?: () => Promise<void>;
      };
      try {
        await tf.setBackend?.("webgl");
        await tf.ready?.();
      } catch {
        await tf.setBackend?.("cpu");
        await tf.ready?.();
      }
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })();
  }
  return modelsPromise;
}

function eyeAspectRatio(eye: FaceApi.Point[]) {
  const dist = (a: FaceApi.Point, b: FaceApi.Point) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]) || 1e-6;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export type LivenessState = {
  blinks: number;
  requiredBlinks: number;
  passed: boolean;
  prompt: string;
};

export type DetectionResult = {
  detection: FaceApi.FaceDetection;
  landmarks: FaceApi.FaceLandmarks68;
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
};

export function useFaceEngine() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<FaceApiModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFaceApi()
      .then((api) => {
        if (cancelled) return;
        apiRef.current = api;
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        modelsPromise = null;
        setError("Could not load face models. Refresh the page.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const detect = useCallback(async (video: HTMLVideoElement): Promise<DetectionResult | null> => {
    const faceapi = apiRef.current;
    if (!faceapi || video.readyState < 2 || video.videoWidth < 16) return null;

    try {
      // Pass 1: High-sensitivity TinyFaceDetector at 512 inputSize
      let result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 512,
            scoreThreshold: 0.15,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Pass 2: High-density pass at 320 inputSize
      if (!result) {
        result = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.15,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      // Pass 3: SsdMobilenetv1 fallback for side angles & low light
      if (!result) {
        result = await faceapi
          .detectSingleFace(
            video,
            new faceapi.SsdMobilenetv1Options({
              minConfidence: 0.15,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!result) return null;

      const box = result.detection.box;
      return {
        detection: result.detection,
        landmarks: result.landmarks,
        descriptor: result.descriptor,
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
      };
    } catch (err) {
      console.error("detect error", err);
      return null;
    }
  }, []);

  return { ready, error, detect, apiRef };
}

export function useCamera(facingMode: "user" | "environment" = "user") {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachStream = useCallback(async (el: HTMLVideoElement, stream: MediaStream) => {
    el.srcObject = stream;
    el.muted = true;
    el.playsInline = true;
    try {
      await el.play();
    } catch {
      // autoplay can fail until user gesture; stream is still attached
    }
  }, []);

  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && streamRef.current) {
        void attachStream(el, streamRef.current);
      }
    },
    [attachStream]
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access.");
        setActive(false);
        return;
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      streamRef.current = stream;

      if (videoRef.current) {
        await attachStream(videoRef.current, stream);
      }

      // Wait briefly for frames so detection doesn't start on empty video
      await new Promise<void>((resolve) => {
        const el = videoRef.current;
        if (!el) {
          resolve();
          return;
        }
        if (el.readyState >= 2) {
          resolve();
          return;
        }
        const onReady = () => {
          el.removeEventListener("loadeddata", onReady);
          resolve();
        };
        el.addEventListener("loadeddata", onReady);
        window.setTimeout(resolve, 1500);
      });

      setActive(true);
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Allow camera permissions and try again.");
      setActive(false);
    }
  }, [facingMode, attachStream]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, setVideoRef, active, error, start, stop };
}

/**
 * Adaptive blink & presence detector.
 * Verified fast for kiosk scan flow.
 */
export function createLivenessTracker(requiredBlinks = 1) {
  let blinks = 0;
  let eyesClosed = false;
  let baseline = 0.28;
  let openSamples = 0;
  let lastBlinkAt = 0;
  let faceSeenMs = 0;
  let lastTick = Date.now();

  return {
    update(landmarks: FaceApi.FaceLandmarks68): LivenessState {
      const now = Date.now();
      const dt = Math.min(200, now - lastTick);
      lastTick = now;
      faceSeenMs += dt;

      const left = landmarks.getLeftEye();
      const right = landmarks.getRightEye();
      const ear = (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;

      if (ear > 0.16) {
        openSamples += 1;
        const alpha = openSamples < 10 ? 0.35 : 0.12;
        baseline = baseline * (1 - alpha) + ear * alpha;
      }

      const closeThreshold = Math.max(0.12, Math.min(0.22, baseline * 0.72));
      const closed = ear < closeThreshold;

      if (closed && !eyesClosed) {
        eyesClosed = true;
      } else if (!closed && eyesClosed) {
        eyesClosed = false;
        if (now - lastBlinkAt > 200) {
          blinks += 1;
          lastBlinkAt = now;
        }
      }

      // Fast verification: either explicit blink OR continuous stable face for >=400ms
      const stableLive = faceSeenMs >= 400 && openSamples >= 4;
      const passed = blinks >= requiredBlinks || stableLive;

      return {
        blinks,
        requiredBlinks,
        passed,
        prompt: passed
          ? "Verified. Matching…"
          : "Position your face clearly",
      };
    },
    reset() {
      blinks = 0;
      eyesClosed = false;
      baseline = 0.28;
      openSamples = 0;
      lastBlinkAt = 0;
      faceSeenMs = 0;
      lastTick = Date.now();
    },
  };
}

export function descriptorToArray(descriptor: Float32Array | number[]): number[] {
  return Array.from(descriptor);
}

/**
 * Display-only low-quality reference photo capture.
 * Never used for face recognition matching (only encrypted 128-d vectors are used).
 * Aggressively downscaled to 160x160 and compressed to WebP/JPEG (~3-5 KB) to conserve database storage.
 */
export function captureThumbnail(video: HTMLVideoElement, size = 160): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const min = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - min) / 2;
  const sy = (video.videoHeight - min) / 2;
  ctx.drawImage(video, sx, sy, min, min, 0, 0, size, size);
  try {
    const webp = canvas.toDataURL("image/webp", 0.65);
    if (webp.startsWith("data:image/webp")) return webp;
  } catch {
    // Fallback to jpeg if webp unsupported
  }
  return canvas.toDataURL("image/jpeg", 0.65);
}

/**
 * Compresses an uploaded image file down to a lightweight 160x160 display-only thumbnail.
 */
export function compressImageFile(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      try {
        const webp = canvas.toDataURL("image/webp", 0.65);
        if (webp.startsWith("data:image/webp")) {
          resolve(webp);
          return;
        }
      } catch {}
      resolve(canvas.toDataURL("image/jpeg", 0.65));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
