"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, KeyRound, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui/primitives";

interface AppLockContextType {
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: (password: string) => Promise<boolean>;
  isSettingsUnlocked: boolean;
  unlockSettings: (password: string) => Promise<boolean>;
  lockSettings: () => void;
}

const AppLockContext = createContext<AppLockContextType>({
  isLocked: false,
  lockApp: () => {},
  unlockApp: async () => false,
  isSettingsUnlocked: false,
  unlockSettings: async () => false,
  lockSettings: () => {},
});

export const useAppLock = () => useContext(AppLockContext);

const LOCK_STORAGE_KEY = "kips_app_locked";
const SETTINGS_LOCK_KEY = "kips_settings_unlocked";
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-lock

export function AppLockProvider({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize lock state from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(LOCK_STORAGE_KEY);
      if (stored === "true") {
        setIsLocked(true);
      }
      const settingsStored = sessionStorage.getItem(SETTINGS_LOCK_KEY);
      if (settingsStored === "true") {
        setIsSettingsUnlocked(true);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Lock the app
  const lockApp = useCallback(() => {
    setIsLocked(true);
    setUnlockPassword("");
    setUnlockError(null);
    try {
      sessionStorage.setItem(LOCK_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  // Auto-lock on inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      lockApp();
    }, IDLE_TIMEOUT_MS);
  }, [lockApp]);

  useEffect(() => {
    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => resetIdleTimer();

    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );
    resetIdleTimer();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Unlock app
  const unlockApp = async (password: string): Promise<boolean> => {
    setIsSubmitting(true);
    setUnlockError(null);
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "Incorrect password");
        setIsSubmitting(false);
        return false;
      }

      setIsLocked(false);
      setUnlockPassword("");
      try {
        sessionStorage.removeItem(LOCK_STORAGE_KEY);
      } catch {
        // ignore
      }
      setIsSubmitting(false);
      return true;
    } catch {
      setUnlockError("Verification failed. Please check network.");
      setIsSubmitting(false);
      return false;
    }
  };

  // Unlock settings
  const unlockSettings = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      setIsSettingsUnlocked(true);
      try {
        sessionStorage.setItem(SETTINGS_LOCK_KEY, "true");
      } catch {
        // ignore
      }
      return true;
    } catch {
      return false;
    }
  };

  const lockSettings = useCallback(() => {
    setIsSettingsUnlocked(false);
    try {
      sessionStorage.removeItem(SETTINGS_LOCK_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleSignOut = async () => {
    try {
      sessionStorage.clear();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        lockApp,
        unlockApp,
        isSettingsUnlocked,
        unlockSettings,
        lockSettings,
      }}
    >
      {children}

      {/* Military Grade Lock Overlay */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in px-4"
        >
          <div className="w-full max-w-md rounded-[20px] border border-amber-500/30 bg-[#0c1017] p-7 shadow-2xl shadow-black/80 text-white animate-rise">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Lock size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg tracking-tight text-white">
                    App Security Lock
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    Z++ SECURED
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Portal locked to protect sensitive college data
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                  {adminName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-200">{adminName}</p>
                  <p className="text-[11px] text-neutral-400">Authorized Administrator</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 size={13} /> Active Session
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await unlockApp(unlockPassword);
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <Label htmlFor="lock-pwd" className="text-xs font-medium text-neutral-300">
                  Admin Password to Unlock
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="lock-pwd"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    required
                    className="h-11 bg-black/50 border-white/15 text-white placeholder:text-neutral-500 pr-10 focus:border-amber-400 focus:ring-amber-400/20"
                  />
                  <KeyRound
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                  />
                </div>
              </div>

              {unlockError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                  <ShieldAlert size={15} className="shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !unlockPassword}
                  className="flex-1 h-11 bg-amber-500 text-black font-semibold hover:bg-amber-400 active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Unlocking...
                    </>
                  ) : (
                    "Unlock Console"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of portal"
                  className="flex h-11 items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/5 px-3 text-xs text-neutral-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </form>

            <p className="mt-5 text-center text-[10px] text-neutral-500">
              Auto-lock active (10m idle). Next.js Edge Shield Z++ Protection.
            </p>
          </div>
        </div>
      )}
    </AppLockContext.Provider>
  );
}
