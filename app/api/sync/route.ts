import { NextRequest } from "next/server";
import { requireAdmin, jsonError, jsonSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { interviewInclude, interviewToRow } from "@/lib/repo";
import { sheetsEnabled, syncInterviewsToSheet } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retry Google Sheets sync for interviews that are missing or FAILED.
 * Consumers choose: ?mode=missing retries PENDING/FAILED rows only,
 * ?mode=all re-pushes everything (deduplication is the owner's concern).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  if (!sheetsEnabled()) {
    return jsonError("همگام‌سازی با Google Sheets در تنظیمات فعال نشده است.", 400);
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "missing";

  try {
    const where =
      mode === "all"
        ? {}
        : { sheetStatus: { in: ["PENDING", "FAILED"] as never } };

    const raw = await prisma.interview.findMany({
      where,
      include: interviewInclude,
      orderBy: { createdAt: "asc" },
    });

    if (raw.length === 0) {
      return jsonSuccess({ synced: 0, total: 0 });
    }

    const result = await syncInterviewsToSheet(raw.map(interviewToRow));
    if (!result.ok) {
      return jsonError(
        "همگام‌سازی با Google Sheets ناموفق بود. " + (result.error ?? ""),
        502,
      );
    }

    // Mark all pushed rows as synced (batch mode).
    const ids = raw.map((r) => r.id);
    await prisma.interview.updateMany({
      where: { id: { in: ids } },
      data: { sheetStatus: "SYNCED", sheetError: null, syncedAt: new Date() },
    });

    return jsonSuccess({ synced: ids.length, total: raw.length });
  } catch {
    return jsonError("در همگام‌سازی با Google Sheets خطایی رخ داد.", 500);
  }
}