import { NextResponse } from "next/server";
import { requireAdmin, jsonError, jsonSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { noteCreateSchema } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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

  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "یادداشت نامعتبر است.", 422);
  }

  try {
    const exists = await prisma.interview.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return jsonError("مصاحبه یافت نشد.", 404);

    const note = await prisma.interviewNote.create({
      data: { interviewId: id, content: parsed.data.content },
    });
    return jsonSuccess(
      { id: note.id, content: note.content, createdAt: note.createdAt.toISOString() },
      { status: 201 },
    );
  } catch {
    return jsonError("امکان ذخیره یادداشت وجود ندارد.", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId?: string }> },
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id, noteId } = await params;
  if (!noteId) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    await prisma.interviewNote.deleteMany({
      where: { id: noteId, interviewId: id },
    });
    return jsonSuccess({ deleted: noteId });
  } catch {
    return jsonError("خطا در حذف یادداشت.", 500);
  }
}