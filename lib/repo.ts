import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  displayAnswer,
  type AnswerPayload,
} from "@/lib/answers";
import { getQuestion } from "@/lib/questions";
import type { InterviewRow } from "@/lib/dashboard";
import type { CsvInterviewRow } from "@/lib/csv";
import { safeJsonParse } from "@/lib/utils";
import type { AnswerMap } from "@/lib/validate";

export const interviewInclude = {
  store: true,
  notes: { orderBy: { createdAt: "asc" as const } },
  answers: true,
} satisfies Prisma.InterviewInclude;

/**
 * Structural contract accepted by the repo layer. Both the production client
 * (PostgreSQL) and the test client (SQLite, generated/prisma-test) are
 * structurally assignable to this, even though their Prisma namespaces are
 * not identical TypeScript types.
 */
export type PrismaClientLike = {
  // Delegates and $transaction are `any` on purpose: Prisma's generated
  // delegate classes across namespaces are structurally incompatible in TS,
  // but both the production client and the test client work here.
  $transaction: any;
  interview: any;
  store: any;
  interviewAnswer: any;
  interviewNote: any;
};

function mapAnswerRow(
  a: { questionKey: string; answer: string | null; answerData: string | null },
) {
  return {
    questionKey: a.questionKey,
    answer: a.answer,
    answerData: a.answerData,
  };
}

/** Convert a full prisma interview (with include) into the shared row shape. */
export type InterviewFull = Prisma.InterviewGetPayload<{ include: typeof interviewInclude }>;

export function interviewToRow(iv: InterviewFull): CsvInterviewRow {
  return {
    id: iv.id,
    code: iv.code,
    status: iv.status,
    verdict: iv.verdict,
    createdAt: iv.createdAt,
    completedAt: iv.completedAt,
    summary: iv.summary,
    store: iv.store
      ? {
          name: iv.store.name,
          activityType: iv.store.activityType ?? undefined,
          yearsActive: iv.store.yearsActive ?? undefined,
          productCount: iv.store.productCount ?? undefined,
          carBrands: safeJsonParse<string[]>(iv.store.carBrands) ?? [],
        }
      : null,
    notes: iv.notes?.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt })) ?? [],
    answers: iv.answers.map(mapAnswerRow),
  };
}

export function answerMapFromInterview(iv: InterviewRow): AnswerMap {
  const map: AnswerMap = {};
  for (const a of iv.answers) {
    const parsed = safeJsonParse<string | number | string[] | null>(a.answerData);
    map[a.questionKey] =
      parsed === null && typeof a.answer === "string" ? a.answer : (parsed as never);
  }
  return map;
}

export interface CreateInterviewInput {
  store: {
    name: string;
    activityType: string;
    yearsActive: string;
    productCount?: number | null;
    carBrands: string[];
  };
  answers: AnswerPayload[];
  verdict?: "POSITIVE" | "MIXED" | "NEGATIVE" | null;
  summary?: string;
  note?: string;
  status?: "DRAFT" | "COMPLETED";
}

/** Persist a new interview (store + answers + optional note) atomically. */
export async function createInterview(
  input: CreateInterviewInput,
  client: PrismaClientLike = prisma,
) {
  return client.$transaction(async (tx: any) => {
    // Compute the next sequential code app-side (max + 1) so the schema stays
    // portable between PostgreSQL and the SQLite test runner.
    const last = await tx.interview.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const code = (last?.code ?? 0) + 1;

    const interview = await tx.interview.create({
      data: {
        code,
        status: input.status ?? "COMPLETED",
        verdict: input.verdict ?? null,
        summary: input.summary ?? null,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        store: {
          create: {
            name: input.store.name,
            activityType: input.store.activityType,
            yearsActive: input.store.yearsActive,
            productCount: input.store.productCount ?? null,
            carBrands: JSON.stringify(input.store.carBrands ?? []),
          },
        },
        answers: {
          create: input.answers.map((a) => ({
            questionKey: a.questionKey,
            answer: a.answer,
            answerData: a.answerData,
            questionLabel: a.questionLabel,
            questionGroup: a.questionGroup,
          })),
        },
      },
    });

    if (input.note?.trim()) {
      await tx.interviewNote.create({
        data: { interviewId: interview.id, content: input.note.trim() },
      });
    }

    return interview.id;
  });
}

/** Replace a full interview: store + answers. Notes are only appended. */
export async function updateInterview(
  id: string,
  input: CreateInterviewInput,
  client: PrismaClientLike = prisma,
) {
  return client.$transaction(async (tx: any) => {
    const existing = await tx.interview.findUnique({ where: { id } });
    if (!existing) return null;

    if (input.store) {
      await tx.store.upsert({
        where: { interviewId: id },
        create: {
          interviewId: id,
          name: input.store.name,
          activityType: input.store.activityType,
          yearsActive: input.store.yearsActive,
          productCount: input.store.productCount ?? null,
          carBrands: JSON.stringify(input.store.carBrands ?? []),
        },
        update: {
          name: input.store.name,
          activityType: input.store.activityType,
          yearsActive: input.store.yearsActive,
          productCount: input.store.productCount ?? null,
          carBrands: JSON.stringify(input.store.carBrands ?? []),
        },
      });
    }

    await tx.interviewAnswer.deleteMany({ where: { interviewId: id } });
    if (input.answers.length > 0) {
      await tx.interviewAnswer.createMany({
        data: input.answers.map((a) => ({
          interviewId: id,
          questionKey: a.questionKey,
          answer: a.answer,
          answerData: a.answerData,
          questionLabel: a.questionLabel,
          questionGroup: a.questionGroup,
        })),
      });
    }

    const updated = await tx.interview.update({
      where: { id },
      data: {
        status: input.status ?? "COMPLETED",
        verdict: input.verdict ?? null,
        summary: input.summary ?? null,
        completedAt: input.status === "COMPLETED" ? new Date() : existing.completedAt,
      },
    });

    return updated.id;
  });
}

export async function deleteInterview(
  id: string,
  client: PrismaClientLike = prisma,
): Promise<boolean> {
  try {
    await client.interview.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export interface ListFilters {
  search?: string;
  verdict?: string;
  status?: string;
  sort?: "date" | "name" | "code" | "commission";
  order?: "asc" | "desc";
  limit?: number;
}

/** Map a sort key to a prisma orderBy clause (default postgres-safe). */
function buildOrderBy(sort: ListFilters["sort"], order: "asc" | "desc") {
  switch (sort) {
    case "name":
      return [{ store: { name: order } }];
    case "code":
      return [{ code: order }];
    case "commission": {
      // Use answers sorted after fetching; fall back to code ordering.
      return [{ updatedAt: order }];
    }
    case "date":
    default:
      return [{ completedAt: { sort: order, nulls: "last" as const } }];
  }
}

export async function listInterviews(filters: ListFilters = {}) {
  const where: Prisma.InterviewWhereInput = {};
  const order: "asc" | "desc" = filters.order === "asc" ? "asc" : "desc";

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    // NOTE: no `mode: "insensitive"` here — SQLite's filter mode differs from
    // PostgreSQL and would fail in the test runner; plain `contains` is enough
    // (SQLite LIKE is already case-insensitive for ASCII).
    where.OR = [
      { store: { is: { name: { contains: q } } } },
      { answers: { some: { answer: { contains: q } } } },
    ];
  }
  if (filters.verdict) {
    where.verdict = filters.verdict as Prisma.InterviewWhereInput["verdict"];
  }
  if (filters.status) {
    where.status = filters.status as Prisma.InterviewWhereInput["status"];
  }

  const items = await prisma.interview.findMany({
    where,
    include: interviewInclude,
    orderBy: buildOrderBy(filters.sort, order),
    take: filters.limit ?? 200,
  });

  return items.map((iv) => interviewToRow(iv as unknown as InterviewFull));
}

/** Derive a display label from a stored answer row using the catalog. */
export function displayFromStored(
  questionKey: string,
  answer: string | null,
  answerData: string | null,
): string | null {
  const q = getQuestion(questionKey);
  if (!q) return answer;
  const parsed = safeJsonParse<string | number | string[] | null>(answerData);
  if (parsed === null) return answer;
  return displayAnswer(q, parsed as never) ?? answer;
}