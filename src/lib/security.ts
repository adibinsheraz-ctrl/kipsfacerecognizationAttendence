import { prisma } from "./db";

type AttemptRecord = {
  failures: number;
  lockedUntil: number | null;
  firstFailureTime: number;
};

const loginAttempts = new Map<string, AttemptRecord>();

const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutes failure window

export function checkLoginLockout(ip: string): {
  isLocked: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  // If locked, check if lockout duration expired
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, remainingAttempts: 0 };
    }
    // Lockout expired, reset
    loginAttempts.delete(ip);
    return { isLocked: false, remainingSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  // If outside the failure window, reset
  if (now - record.firstFailureTime > WINDOW_DURATION_MS) {
    loginAttempts.delete(ip);
    return { isLocked: false, remainingSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  const remaining = Math.max(0, MAX_FAILURES - record.failures);
  return { isLocked: false, remainingSeconds: 0, remainingAttempts: remaining };
}

export async function recordLoginFailure(ip: string, email: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    loginAttempts.set(ip, {
      failures: 1,
      lockedUntil: null,
      firstFailureTime: now,
    });
  } else {
    // If window expired, restart window
    if (now - record.firstFailureTime > WINDOW_DURATION_MS) {
      record.failures = 1;
      record.firstFailureTime = now;
      record.lockedUntil = null;
    } else {
      record.failures += 1;
      if (record.failures >= MAX_FAILURES) {
        record.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
    }
  }

  const updatedRecord = loginAttempts.get(ip);
  const isLocked = updatedRecord?.lockedUntil ? true : false;
  const remainingSeconds = updatedRecord?.lockedUntil
    ? Math.ceil((updatedRecord.lockedUntil - now) / 1000)
    : 0;
  const remainingAttempts = Math.max(0, MAX_FAILURES - (updatedRecord?.failures || 1));

  try {
    await prisma.securityLog.create({
      data: {
        type: isLocked ? "account_locked" : "login_failed",
        ip,
        email: email.trim().toLowerCase(),
        details: isLocked
          ? `Account locked for 5 minutes after ${MAX_FAILURES} failed attempts`
          : `Failed login attempt (${updatedRecord?.failures || 1}/${MAX_FAILURES})`,
      },
    });
  } catch (err) {
    console.error("Failed to write security log:", err);
  }

  return { isLocked, remainingSeconds, remainingAttempts };
}

export async function recordLoginSuccess(ip: string, email: string) {
  // Clear any existing failed attempts for this IP on successful login
  loginAttempts.delete(ip);

  try {
    await prisma.securityLog.create({
      data: {
        type: "login_success",
        ip,
        email: email.trim().toLowerCase(),
        details: "Successful admin authentication",
      },
    });
  } catch (err) {
    console.error("Failed to write security log:", err);
  }
}
