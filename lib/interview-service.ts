import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storeSchema, verdictSchema } from "@/lib/validate";
import { QUESTIONS, isQuestionVisible } from "@/lib/questions";
import { normalizeAnswers } from "@/lib/answers";
import {
  createInterview,
  updateInterview,
  interviewToRow,
  interviewInclude,
  type CreateInterviewInput,
  type InterviewFull,
} from "@/lib/repo";
import { syncInterviewToSheet, sheetsEnabled } from "@/lib/sheets";

/** Raw client payload: answers arrive as a key→value record. */
export const rawAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())]),
);

export const interviewRawSchema = z.object({
  store: storeSchema,
  answers: rawAnswersSchema,
  verdict: verdictSchema,
  summary: z.string().trim().max(4000, "متن بیش از حد طولانی است.").nullish(),
  note: z.string().trim().max(8000, "یادداشت بیش از حد طولانی است.").nullish(),
  status: z.enum(["DRAFT", "COMPLETED"]).optional().default("COMPLETED"),
});

export type InterviewRawInput = z.infer<typeof interviewRawSchema>;

export type ParsedInput = CreateInterviewInput & {
  note?: string;
  status?: "DRAFT" | "COMPLETED";
};

export interface ParseResult {
  ok: true;
  input: ParsedInput;
}
export interface ParseFailure {
  ok: false;
  errors: Record<string, string>;
  message: string;
}

/**
 * Validate & normalize a raw submission payload. Runs catalog-driven
 * validation over every visible/required question before persisting.
 */
export function parseInterviewSubmission(body: unknown): ParseResult | ParseFailure {
  const parsed = interviewRawSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "answers" ? String(issue.path[1] ?? "answers") : issue.path.join(".");
      if (!errors[key]) errors[key] = issue.message;
    }
    return {
      ok: false,
      errors,
      message: errors[Object.keys(errors)[0]] ?? "داده‌های ارسالی معتبر نیستند.",
    };
  }

  const { store, answers, verdict, summary, note, status } = parsed.data;
  const answerMap = answers as Record<string, string | string[]>;

  // Catalog-driven validation (only visible questions are required).
  const validationErrors: Record<string, string> = {};
  for (const q of QUESTIONS) {
    if (!isQuestionVisible(q, answerMap)) continue;
    const value = answerMap[q.key];
    const empty =
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (q.required) validationErrors[q.key] = "این پاسخ الزامی است.";
      continue;
    }
    if (q.type === "number") {
      if (Array.isArray(value)) continue;
      const num = typeof value === "string" ? Number(value) : value;
      if (!Number.isFinite(num)) {
        validationErrors[q.key] = "لطفاً یک عدد معتبر وارد کنید.";
        continue;
      }
      if (q.min !== undefined && num < q.min) {
        validationErrors[q.key] = `مقدار نمی‌تواند کمتر از ${q.min} باشد.`;
      }
      if (q.max !== undefined && num > q.max) {
        validationErrors[q.key] = `مقدار نمی‌تواند بیشتر از ${q.max} باشد.`;
      }
      continue;
    }
    if ((q.type === "select" || q.type === "radio") && q.options) {
      if (typeof value !== "string" || !q.options.some((o) => o.value === value)) {
        validationErrors[q.key] = "لطفاً یکی از گزینه‌ها را انتخاب کنید.";
      }
    }
  }

  if (Object.keys(validationErrors).length > 0) {
    return {
      ok: false,
      errors: validationErrors,
      message: "برخی پاسخ‌های الزامی ناقص یا نامعتبر هستند.",
    };
  }

  return {
    ok: true,
    input: {
      store: {
        name: store.name,
        activityType: store.activityType,
        yearsActive: store.yearsActive,
        productCount: store.productCount ?? null,
        carBrands: store.carBrands,
      },
      answers: normalizeAnswers(answerMap),
      verdict: verdict ?? null,
      summary: summary ?? undefined,
      note: note ?? undefined,
      status: status ?? "COMPLETED",
    },
  };
}

export interface SaveResult {
  id: string | null;
  sheetsWarning: boolean;
  error?: string;
}

async function rowForSync(interviewId: string) {
  const raw = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: interviewInclude,
  });
  if (!raw) return null;
  return interviewToRow(raw as unknown as InterviewFull);
}

/**
 * Push a saved interview to Google Sheets and record the outcome on the row.
 * Never throws — failures are recorded as sheetStatus = FAILED.
 * Returns true when a Sheets warning should be surfaced to the user.
 */
export async function syncRowSheetStatus(interviewId: string): Promise<boolean> {
  if (!sheetsEnabled()) return false;
  const row = await rowForSync(interviewId);
  if (!row) return false;
  const result = await syncInterviewToSheet(row);
  await prisma.interview
    .update({
      where: { id: interviewId },
      data: {
        sheetStatus: result.ok ? "SYNCED" : "FAILED",
        sheetError: result.ok ? null : result.error ?? null,
        syncedAt: result.ok ? new Date() : null,
      },
    })
    .catch(() => undefined);
  return !result.ok;
}

/** Create a new interview from a validated input, then attempt Sheets sync. */
export async function saveNewInterview(
  input: ParsedInput,
  db: typeof prisma = prisma,
): Promise<SaveResult> {
  try {
    const id = await createInterview(input, db);
    const sheetsWarning = await syncRowSheetStatus(id);
    return { id, sheetsWarning };
  } catch {
    return {
      id: null,
      sheetsWarning: false,
      error: "امکان ذخیره در پایگاه داده وجود ندارد. بعداً دوباره تلاش کنید.",
    };
  }
}

/** Update an interview, then attempt Sheets sync. */
export async function saveUpdatedInterview(
  id: string,
  input: ParsedInput,
  db: typeof prisma = prisma,
): Promise<SaveResult> {
  try {
    const updatedId = await updateInterview(id, input, db);
    if (!updatedId) return { id: null, sheetsWarning: false, error: "مصاحبه یافت نشد." };
    const sheetsWarning = await syncRowSheetStatus(updatedId);
    return { id: updatedId, sheetsWarning };
  } catch {
    return {
      id: null,
      sheetsWarning: false,
      error: "امکان ذخیره در پایگاه داده وجود ندارد. بعداً دوباره تلاش کنید.",
    };
  }
}