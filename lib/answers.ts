import {
  QUESTIONS,
  QUESTION_MAP,
  isQuestionVisible,
  type Question,
} from "@/lib/questions";
import { safeJsonStringify, safeJsonParse } from "@/lib/utils";
import type { AnswerMap, AnswerValue } from "@/lib/validate";

export interface AnswerPayload {
  questionKey: string;
  answer: string | null;
  answerData: string | null;
  questionLabel: string;
  questionGroup: string;
}

/** Rendered, human-readable Persian answer string for a value. */
export function displayAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const labels = value
      .map((v) => question.options?.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);
    return labels.length ? labels.join("، ") : null;
  }
  if (typeof value === "number") {
    return `${value}${question.suffix ?? ""}`;
  }
  if (typeof value === "string") {
    const option = question.options?.find((o) => o.value === value);
    const text = option?.label ?? value;
    return value.trim() ? `${text}${question.suffix ?? ""}` : null;
  }
  return null;
}

/**
 * Convert a form AnswerMap into DB-ready answer rows using the catalog.
 * Unknown / hidden question keys are ignored — safe against future catalog changes.
 */
export function normalizeAnswers(answers: AnswerMap): AnswerPayload[] {
  const rows: AnswerPayload[] = [];
  for (const question of QUESTIONS) {
    if (!isQuestionVisible(question, answers)) continue;
    const value = answers[question.key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    // Coerce number questions to a real number for typed storage.
    if (question.type === "number") {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) continue;
      rows.push({
        questionKey: question.key,
        answer: displayAnswer(question, num),
        answerData: safeJsonStringify(num),
        questionLabel: question.label,
        questionGroup: question.group,
      });
      continue;
    }

    rows.push({
      questionKey: question.key,
      answer: displayAnswer(question, value),
      answerData: safeJsonStringify(value),
      questionLabel: question.label,
      questionGroup: question.group,
    });
  }
  return rows;
}

/** Rehydrate a typed AnswerMap from stored rows (for edit/conditional logic). */
export function answersFromRows(
  rows: { questionKey: string; answerData?: string | null; answer?: string | number | null }[],
): AnswerMap {
  const map: AnswerMap = {};
  for (const row of rows) {
    const question = QUESTION_MAP.get(row.questionKey);
    if (!question) continue;
    if (question.type === "number") {
      const parsed = safeJsonParse<number>(row.answerData);
      map[row.questionKey] = typeof parsed === "number" ? parsed : Number(row.answer) || undefined;
    } else if (question.type === "multiselect") {
      const parsed = safeJsonParse<string[]>(row.answerData);
      map[row.questionKey] = Array.isArray(parsed)
        ? parsed
        : typeof row.answer === "string"
          ? [row.answer]
          : undefined;
    } else {
      const parsed = safeJsonParse<string | string[]>(row.answerData);
      if (typeof parsed === "string") {
        map[row.questionKey] = parsed;
      } else if (Array.isArray(parsed)) {
        map[row.questionKey] = parsed;
      } else {
        map[row.questionKey] = row.answer ?? undefined;
      }
    }
  }
  return map;
}

export function isComplete(answers: AnswerMap): boolean {
  for (const question of QUESTIONS) {
    if (!isQuestionVisible(question, answers)) continue;
    const raw = answers[question.key];
    const empty =
      raw === undefined ||
      raw === null ||
      raw === "" ||
      (Array.isArray(raw) && raw.length === 0);
    if (empty && question.required) return false;
    // incomplete custom data
    if (raw !== undefined && raw !== null && raw !== "" && String(raw).trim() === "") return false;
  }
  return true;
}

export { QUESTIONS };