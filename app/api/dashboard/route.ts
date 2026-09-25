import { NextRequest } from "next/server";
import { requireAdmin, jsonError, jsonSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { interviewInclude, interviewToRow } from "@/lib/repo";
import { computeDashboard } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  try {
    const raw = await prisma.interview.findMany({
      include: interviewInclude,
      orderBy: { createdAt: "desc" },
    });
    const stats = computeDashboard(raw.map(interviewToRow));
    return jsonSuccess({ stats, generatedAt: new Date().toISOString() });
  } catch {
    return jsonError("در محاسبه آمار خطایی رخ داد.", 500);
  }
}