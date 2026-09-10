/** Euclidean distance between two face descriptors. */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export type MatchCandidate = {
  personId: string;
  name: string;
  rollNumber: string;
  department: string;
  className: string;
  thumbnail: string | null;
  descriptors: number[][];
};

export type MatchResult = {
  person: Omit<MatchCandidate, "descriptors">;
  distance: number;
  confidence: number;
} | null;

/**
 * Match probe against all enrolled descriptors.
 * Uses best distance per person + margin vs runner-up to cut false positives
 * while keeping true-positive rate high for kiosk use.
 */
export function findBestMatch(
  probe: number[],
  candidates: MatchCandidate[],
  threshold: number
): MatchResult {
  type Scored = {
    person: Omit<MatchCandidate, "descriptors">;
    distance: number;
  };

  const perPerson: Scored[] = [];

  for (const candidate of candidates) {
    if (!candidate.descriptors || candidate.descriptors.length === 0) continue;
    let minDistance = Number.POSITIVE_INFINITY;
    for (const ref of candidate.descriptors) {
      const dist = euclideanDistance(probe, ref);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    perPerson.push({
      person: {
        personId: candidate.personId,
        name: candidate.name,
        rollNumber: candidate.rollNumber,
        department: candidate.department,
        className: candidate.className,
        thumbnail: candidate.thumbnail,
      },
      distance: minDistance,
    });
  }

  perPerson.sort((a, b) => a.distance - b.distance);
  const best = perPerson[0];
  if (!best || best.distance > threshold) return null;

  const second = perPerson[1];
  // Ambiguous check: reject only if 2 candidates are virtually indistinguishable (<0.02)
  if (second && second.distance - best.distance < 0.02 && second.distance <= threshold) {
    return null;
  }

  return {
    person: best.person,
    distance: best.distance,
    confidence: Math.max(0, Math.min(1, 1 - best.distance / Math.max(threshold, 0.01))),
  };
}

/** Simple in-memory rate limiter for recognition attempts. */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
