import { NextRequest } from "next/server";
import { requireAdmin, jsonError, jsonSuccess } from "@/lib/api";
import { listInterviews } from "@/lib/repo";
import { parseInterviewSubmission, saveNewInterview } from "@/lib/interview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERDICT_VALUES = ["POSITIVE", "MIXED", "NEGATIVE"];
const STATUS_VALUES = ["DRAFT", "COMPLETED"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const verdict = sp.get("verdict");
  const search = sp.get("search") ?? sp.get("q") ?? undefined;
  const sort = (sp.get("sort") ?? "date") as "date" | "name" | "code" | "commission";
  const order = (sp.get("order") ?? "desc") as "asc" | "desc";

  if (verdict && !VERDICT_VALUES.includes(verdict)) {
    return jsonError("فیلتر نظر نهایی نامعتبر است.", 422);
  }
  if (status && !STATUS_VALUES.includes(status)) {
    return jsonError("فیلتر وضعیت نامعتبر است.", 422);
  }

  try {
    const interviews = await listInterviews({ search, verdict: verdict ?? undefined, status: status ?? undefined, sort, order });
    return jsonSuccess({
      interviews,
      filter: { search, verdict, status, sort, order },
    });
  } catch {
    return jsonError("در خواندن داده‌ها خطایی رخ داد. لطفاً دوباره تلاش کنید.", 500);
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("درخواست نامعتبر است.", 400);
  }

  const parsed = parseInterviewSubmission(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 422, { errors: parsed.errors });
  }

  const result = await saveNewInterview(parsed.input);
  if (result.error || !result.id) {
    return jsonError(result.error ?? "خطا در ذخیره مصاحبه.", 500);
  }

  return jsonSuccess(
    { id: result.id, sheetsWarning: result.sheetsWarning },
    { status: 201 },
  );
}