import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { getMatchCandidates } from "@/lib/embedding-cache";
import { checkRateLimit, findBestMatch } from "@/lib/face-match";

const schema = z.object({
  descriptor: z.array(z.number()).min(100),
  livenessPassed: z.boolean(),
});

export async function POST(req: Request) {
  const started = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  if (!checkRateLimit(`recognize:${ip}`, 80, 60_000)) {
    await prisma.recognitionAttempt.create({
      data: { success: false, reason: "rate_limited", ipHint: ip },
    });
    return NextResponse.json(
      { error: "Too many attempts. Wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const body = schema.parse(await req.json());
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    // Slightly looser than 0.5 improves true positives under classroom lighting
    const threshold = settings?.matchThreshold ?? 0.55;
    const requireLiveness = settings?.requireLiveness ?? true;

    if (requireLiveness && !body.livenessPassed) {
      await prisma.recognitionAttempt.create({
        data: { success: false, reason: "liveness_failed", ipHint: ip },
      });
      return NextResponse.json(
        {
          matched: false,
          reason: "liveness_failed",
          message: "Liveness check failed. Blink once. Photos will not work.",
        },
        { status: 403 }
      );
    }

    const candidates = await getMatchCandidates();
    if (candidates.length === 0) {
      return NextResponse.json({
        matched: false,
        reason: "no_enrolled",
        message: "No faces enrolled yet. Ask an admin to enroll you first.",
      });
    }

    const match = findBestMatch(body.descriptor, candidates, threshold);

    if (!match) {
      await prisma.recognitionAttempt.create({
        data: { success: false, reason: "no_match", ipHint: ip },
      });
      return NextResponse.json({
        matched: false,
        reason: "no_match",
        message: "Face not recognized. Face the camera, then blink once.",
        ms: Date.now() - started,
      });
    }

    const now = new Date();
    const already = await prisma.attendance.findFirst({
      where: {
        personId: match.person.personId,
        markedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    });

    if (already) {
      await prisma.recognitionAttempt.create({
        data: {
          success: true,
          reason: "already_marked",
          distance: match.distance,
          ipHint: ip,
        },
      });
      return NextResponse.json({
        matched: true,
        alreadyMarked: true,
        attendance: already,
        person: match.person,
        confidence: match.confidence,
        message: `Already Scanned: ${match.person.name} has already scanned attendance today.`,
        ms: Date.now() - started,
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        personId: match.person.personId,
        confidence: match.confidence,
        livenessPassed: body.livenessPassed,
        method: "face",
      },
    });

    await prisma.recognitionAttempt.create({
      data: {
        success: true,
        reason: "marked",
        distance: match.distance,
        ipHint: ip,
      },
    });

    return NextResponse.json({
      matched: true,
      alreadyMarked: false,
      attendance,
      person: match.person,
      confidence: match.confidence,
      message: `Welcome, ${match.person.name}. You're marked present.`,
      ms: Date.now() - started,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid recognition payload" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Recognition failed" }, { status: 500 });
  }
}
