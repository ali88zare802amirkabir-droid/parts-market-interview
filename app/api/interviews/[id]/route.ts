import { type NextRequest } from "next/server";
import { requireAdmin, jsonError, jsonSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { interviewInclude, interviewToRow, deleteInterview } from "@/lib/repo";
import { parseInterviewSubmission, saveUpdatedInterview } from "@/lib/interview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;
  try {
    const raw = await prisma.interview.findUnique({
      where: { id },
      include: interviewInclude,
    });
    if (!raw) return jsonError("مصاحبه یافت نشد.", 404);
    return jsonSuccess({ interview: interviewToRow(raw) });
  } catch {
    return jsonError("در خواندن مصاحبه خطایی رخ داد.", 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;

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

  const result = await saveUpdatedInterview(id, parsed.input);
  if (result.error || !result.id) {
    return jsonError(result.error ?? "خطا در ویرایش مصاحبه.", result.error === "مصاحبه یافت نشد." ? 404 : 500);
  }

  return jsonSuccess({ id: result.id, sheetsWarning: result.sheetsWarning });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;
  try {
    const ok = await deleteInterview(id);
    if (!ok) return jsonError("مصاحبه یافت نشد.", 404);
    return jsonSuccess({ id });
  } catch {
    return jsonError("خطا در حذف مصاحبه.", 500);
  }
}