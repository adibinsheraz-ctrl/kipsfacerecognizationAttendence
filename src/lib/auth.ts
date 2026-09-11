/**
 * © 2024–2025 Adi Bin Sheraz — adi.binsheraz@gmail.com
 * Kips College G-9 Face Recognition Attendance System.
 * Confidential & Proprietary. All Rights Reserved.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "kips_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "kips-dev-jwt-secret-change-me"
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(admin: { id: string; email: string; name: string }) {
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return token;
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin" || !payload.sub) return null;
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: "admin" as const,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const admin = await prisma.admin.findUnique({ where: { id: session.id } });
  if (!admin) return null;
  return session;
}
