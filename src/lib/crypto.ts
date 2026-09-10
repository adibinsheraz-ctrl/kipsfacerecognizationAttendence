/**
 * © Kips College G-9 Face Recognition Attendance System.
 * Confidential & Proprietary. All Rights Reserved.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function getKey(): Buffer {
  const raw = process.env.EMBEDDING_KEY || "kips-dev-embedding-key-change-me";
  return createHash("sha256").update(raw).digest();
}

/** Encrypt face embeddings JSON at rest (AES-256-GCM). */
export function encryptEmbeddings(descriptors: number[][]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(descriptors), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptEmbeddings(payload: string): number[][] {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as number[][];
}
