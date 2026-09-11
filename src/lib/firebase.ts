/**
 * © 2024–2025 Adi Bin Sheraz — adi.binsheraz@gmail.com
 * Kips College G-9 Face Recognition Attendance System.
 * Confidential & Proprietary. All Rights Reserved.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 *
 * Firebase Analytics & App Configuration
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDNVC_lcpgWTIYGj3Nq1uIUL5eBHMhceeY",
  authDomain: "kips-54a45.firebaseapp.com",
  projectId: "kips-54a45",
  storageBucket: "kips-54a45.firebasestorage.app",
  messagingSenderId: "673463222804",
  appId: "1:673463222804:web:350e8edd57299dc7e85d01",
  measurementId: "G-VDGGQCSFQ0",
};

// Prevent duplicate app initialization (Next.js hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let analyticsInstance: Analytics | null = null;

/**
 * Lazily initialise Analytics (browser-only, requires consent/support check).
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (!supported) return null;
  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
}

// ─── Typed event helpers ────────────────────────────────────────────────────

/** Call once after an admin logs in */
export async function analyticsIdentifyAdmin(admin: {
  id: string;
  email: string;
  name: string;
  role: string;
}) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  setUserId(analytics, admin.id);
  setUserProperties(analytics, {
    user_email: admin.email,
    user_name: admin.name,
    user_role: admin.role,
  });

  logEvent(analytics, "login", {
    method: "password",
    user_id: admin.id,
    user_email: admin.email,
    user_name: admin.name,
    user_role: admin.role,
  });
}

/** Log when admin logs out */
export async function analyticsLogout(adminId: string) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, "logout", { user_id: adminId });
  // Clear identity
  setUserId(analytics, "");
}

/** Log a page view with full user context */
export async function analyticsPageView(params: {
  page_path: string;
  page_title?: string;
  user_id?: string;
  user_role?: string;
}) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, "page_view", params);
}

/** Log face attendance events */
export async function analyticsAttendanceEvent(params: {
  event: "face_scan_start" | "face_scan_success" | "face_scan_failure";
  class_id?: string;
  class_name?: string;
  student_id?: string;
  confidence?: number;
}) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, params.event, {
    class_id: params.class_id,
    class_name: params.class_name,
    student_id: params.student_id,
    confidence: params.confidence,
  });
}

/** Generic custom event logger */
export async function analyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

export { app };
