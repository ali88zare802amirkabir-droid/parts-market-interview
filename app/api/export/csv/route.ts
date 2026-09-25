import { NextRequest } from "next/server";
import { requireAdmin, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { interviewInclude, interviewToRow, insensitiveContains } from "@/lib/repo";
import { exportInterviewsToCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  try {
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const verdict = req.nextUrl.searchParams.get("verdict") ?? undefined;
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const raw = await prisma.interview.findMany({
      where: {
        ...(verdict ? { verdict: verdict as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { store: { is: { name: insensitiveContains(search) } } },
                { answers: { some: { answer: insensitiveContains(search) } } },
              ],
            }
          : {}),
      },
      include: interviewInclude,
      orderBy: { completedAt: "desc" },
    });

    const interviews = raw.map(interviewToRow);
    const csv = exportInterviewsToCsv(interviews);

    // Content-Disposition with an ASCII-safe filename for broad compatibility.
    const response = new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="interviews.csv"',
        "Cache-Control": "no-store",
      },
    });
    return response;
  } catch {
    return jsonError("در تهیه خروجی CSV خطایی رخ داد.", 500);
  }
}