"use client";

/**
 * FirebaseAnalyticsProvider
 * Wraps the app and initialises Analytics on first render (browser-only).
 * Also reads user context from a data attribute set by the server layout
 * so Analytics can identify the logged-in admin immediately.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getFirebaseAnalytics,
  analyticsIdentifyAdmin,
  analyticsPageView,
} from "@/lib/firebase";

interface Props {
  /** Pass the logged-in admin from a Server Component */
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  children: React.ReactNode;
}

export default function FirebaseAnalyticsProvider({ admin, children }: Props) {
  const pathname = usePathname();

  // Initialise Analytics once
  useEffect(() => {
    getFirebaseAnalytics().catch(console.error);
  }, []);

  // Identify admin whenever session changes
  useEffect(() => {
    if (!admin) return;
    analyticsIdentifyAdmin(admin).catch(console.error);
  }, [admin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track page views on navigation
  useEffect(() => {
    analyticsPageView({
      page_path: pathname,
      page_title: document.title,
      user_id: admin?.id,
      user_role: admin?.role,
    }).catch(console.error);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
