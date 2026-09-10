import { prisma } from "@/lib/db";
import { decryptEmbeddings } from "@/lib/crypto";
import type { MatchCandidate } from "@/lib/face-match";

type CacheEntry = {
  at: number;
  version: number;
  candidates: MatchCandidate[];
};

let cache: CacheEntry | null = null;
let version = 0;

/** Bust cache after enroll / edit / deactivate so matches stay correct. */
export function invalidateEmbeddingCache() {
  version += 1;
  cache = null;
}

/**
 * In-memory decrypted descriptors for fast kiosk face matching.
 * Avoids re-decrypting on every kiosk scan.
 */
export async function getMatchCandidates(): Promise<MatchCandidate[]> {
  if (cache && cache.version === version && Date.now() - cache.at < 5_000) {
    return cache.candidates;
  }

  const people = await prisma.person.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      department: true,
      className: true,
      thumbnail: true,
      embeddings: true,
    },
  });

  const candidates: MatchCandidate[] = [];
  for (const p of people) {
    try {
      candidates.push({
        personId: p.id,
        name: p.name,
        rollNumber: p.rollNumber,
        department: p.department,
        className: p.className,
        thumbnail: p.thumbnail,
        descriptors: decryptEmbeddings(p.embeddings),
      });
    } catch (err) {
      console.error("Failed to decrypt embeddings for", p.id, err);
    }
  }

  cache = { at: Date.now(), version, candidates };
  return candidates;
}
