import { z } from "zod";
import {
  QUESTIONS,
  QUESTION_MAP,
  getQuestion,
  isQuestionVisible,
  type Question,
} from "@/lib/questions";

export type AnswerValue = string | number | string[];

/** Raw form answers keyed by question key. */
export type AnswerMap = Record<string, AnswerValue | undefined>;

export const VERDICT_VALUES = ["POSITIVE", "MIXED", "NEGATIVE"] as const;
export const INTERVIEW_STATUS_VALUES = ["DRAFT", "COMPLETED"] as const;

/** Validate a single answer raw value against its question definition. */
export function validateAnswerValue(
  question: Question,
  value: AnswerValue | undefined,
  requiredOverride = true,
): string | null {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) {
    if (question.required && requiredOverride) return "این پاسخ الزامی است.";
    return null;
  }

  if (question.type === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "لطفاً یک عدد معتبر وارد کنید.";
    if (question.min !== undefined && num < question.min) {
      return `مقدار نمی‌تواند کمتر از ${question.min} باشد.`;
    }
    if (question.max !== undefined && num > question.max) {
      return `مقدار نمی‌تواند بیشتر از ${question.max} باشد.`;
    }
    return null;
  }

  if (question.type === "multiselect") {
    if (!Array.isArray(value)) return "حداقل یک گزینه را انتخاب کنید.";
    if (question.required && value.length === 0) return "حداقل یک گزینه را انتخاب کنید.";
    return null;
  }

  if (question.type === "select" || question.type === "radio") {
    if (!question.options?.some((o) => o.value === value)) {
      return "لطفاً یکی از گزینه‌ها را انتخاب کنید.";
    }
    return null;
  }

  // text / textarea
  if (typeof value === "string" && value.trim().length === 0) {
    return question.required ? "این پاسخ الزامی است." : null;
  }
  return null;
}

/**
 * Validate one step. Only questions that are visible (given earlier answers)
 * are checked, and required-flagged questions must be answered.
 */
export function validateStep(
  step: number,
  answers: AnswerMap,
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const questions = QUESTIONS.filter(
    (q) => q.step === step && isQuestionVisible(q, answers),
  );
  for (const question of questions) {
    const error = validateAnswerValue(question, answers[question.key]);
    if (error) errors[question.key] = error;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Validate all steps; used right before submit. */
export function validateAll(answers: AnswerMap): Record<string, string> {
  const allErrors: Record<string, string> = {};
  for (const question of QUESTIONS) {
    if (!isQuestionVisible(question, answers)) continue;
    const error = validateAnswerValue(question, answers[question.key]);
    if (error) allErrors[question.key] = error;
  }
  return allErrors;
}

// ---------------------------------------------------------------------------
// API payload schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  username: z
    .string({ required_error: "نام کاربری را وارد کنید." })
    .trim()
    .min(1, "نام کاربری را وارد کنید."),
  password: z
    .string({ required_error: "رمز عبور را وارد کنید." })
    .min(1, "رمز عبور را وارد کنید."),
});

export const storeSchema = z.object({
  name: z.string().trim().min(1, "نام فروشگاه الزامی است."),
  activityType: z
    .string()
    .min(1, "نوع فعالیت را انتخاب کنید.")
    .refine((v) => getQuestion("activity_type")?.options?.some((o) => o.value === v), {
      message: "نوع فعالیت نامعتبر است.",
    }),
  yearsActive: z
    .string()
    .min(1, "سابقه فعالیت را انتخاب کنید.")
    .refine((v) => getQuestion("years_active")?.options?.some((o) => o.value === v), {
      message: "سابقه فعالیت نامعتبر است.",
    }),
  productCount: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
    })
    .refine((v) => v === null || v >= 0, {
      message: "تعداد قطعات باید عدد معتبری باشد.",
    })
    .optional(),
  carBrands: z.array(z.string()).min(1, "حداقل یک دسته خودرو را انتخاب کنید.").default([]),
});

export const answerInputSchema = z.object({
  questionKey: z.string().min(1),
  answer: z.union([z.string(), z.number()]).nullable().optional(),
  answerData: z.any().nullish(),
});

export const verdictSchema = z
  .enum(VERDICT_VALUES)
  .nullable()
  .optional();

export const interviewCreateSchema = z.object({
  store: storeSchema,
  answers: z.array(answerInputSchema).min(1, "حداقل یک پاسخ ارسال کنید."),
  verdict: verdictSchema,
  summary: z.string().trim().max(4000, "متن بیش از حد طولانی است.").optional(),
  note: z.string().trim().max(8000, "یادداشت بیش از حد طولانی است.").optional(),
  status: z.enum(INTERVIEW_STATUS_VALUES).optional().default("COMPLETED"),
});

export const interviewUpdateSchema = interviewCreateSchema.partial().extend({
  id: z.string().min(1).optional(),
});

export const noteCreateSchema = z.object({
  content: z.string().trim().min(1, "یادداشت نمی‌تواند خالی باشد."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StoreInput = z.infer<typeof storeSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;
export type InterviewCreateInput = z.infer<typeof interviewCreateSchema>;

/**
 * Validate a complete submission against the catalog: every visible required
 * question must be present and valid.
 */
export function validateSubmission(
  answers: AnswerMap,
): { ok: boolean; errors: Record<string, string> } {
  const errors = validateAll(answers);
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Type-safe helper to read a value from a parsed answer list (by key).
 */
export function getAnswerValue(
  answers: { questionKey?: string; answer?: string | number | null }[],
  key: string,
): AnswerValue | undefined {
  const found = answers.find((a) => a.questionKey === key);
  return found?.answer as AnswerValue | undefined;
}

export { QUESTION_MAP };