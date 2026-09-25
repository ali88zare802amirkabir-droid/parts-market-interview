import { QUESTIONS } from "@/lib/questions";
import type { InterviewRow } from "@/lib/dashboard";

const VERDICT_LABELS: Record<string, string> = {
  POSITIVE: "مثبت",
  MIXED: "خنثی / با تردید",
  NEGATIVE: "منفی",
};

const WILLING_LABELS: Record<string, string> = {
  yes: "بله",
  maybe: "احتمالاً / نامطمئن",
  no: "خیر",
};

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatSheetDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export const FIXED_COLUMNS = [
  "شماره",
  "تاریخ مصاحبه",
  "نام فروشگاه",
  "نظر نهایی",
  "تمایل به ثبت",
  "کمیسیون پیشنهادی",
  "خلاصه",
] as const;

export interface CsvInterviewRow extends InterviewRow {
  summary?: string | null;
  answers: {
    questionKey: string;
    answer?: string | number | null;
    answerData?: string | null;
    questionLabel?: string;
    questionGroup?: string;
  }[];
}

/**
 * Serialize interviews to a UTF-8 CSV string with a BOM so Excel on Windows
 * correctly renders Persian text. Values are CRLF-joined and quoted when needed.
 */
export function exportInterviewsToCsv(interviews: CsvInterviewRow[]): string {
  const questionColumns = QUESTIONS.map((q) => q.label);
  const headers = [...FIXED_COLUMNS, ...questionColumns];

  const lines: string[] = [headers.map(escapeCsv).join(",")];

  for (const iv of interviews) {
    const answersByKey = new Map<string, string>();
    for (const a of iv.answers ?? []) {
      if (a.answer !== null && a.answer !== undefined) {
        answersByKey.set(a.questionKey, String(a.answer));
      }
    }

    const willingness = answersByKey.get("will_register") ?? "";
    const willingnessKey = Object.keys(WILLING_LABELS).find(
      (k) => WILLING_LABELS[k] === willingness,
    );

    const commission = answersByKey.get("suggested_commission") ?? "";

    const cells: (string | number | null | undefined)[] = [
      iv.code,
      formatSheetDate(iv.completedAt ?? iv.createdAt),
      iv.store?.name ?? answersByKey.get("store_name") ?? "",
      iv.verdict ? VERDICT_LABELS[iv.verdict] ?? iv.verdict : "",
      willingnessKey ? WILLING_LABELS[willingnessKey] : willingness,
      commission,
      iv.summary ?? "",
      ...QUESTIONS.map((q) => answersByKey.get(q.key) ?? ""),
    ];

    lines.push(cells.map(escapeCsv).join(","));
  }

  // BOM first + CRLF line endings.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Build Google Sheets rows sharing the same column layout as the CSV. */
export function buildSheetRows(interviews: CsvInterviewRow[]): (string | number)[][] {
  const headers: (string | number)[] = [...FIXED_COLUMNS, ...QUESTIONS.map((q) => q.label)];
  const rows: (string | number)[][] = [headers];

  for (const iv of interviews) {
    const answersByKey = new Map<string, string>();
    for (const a of iv.answers ?? []) {
      if (a.answer !== null && a.answer !== undefined) {
        answersByKey.set(a.questionKey, String(a.answer));
      }
    }
    const willingness = answersByKey.get("will_register") ?? "";
    const willingnessKey = Object.keys(WILLING_LABELS).find(
      (k) => WILLING_LABELS[k] === willingness,
    );
    rows.push([
      iv.code,
      formatSheetDate(iv.completedAt ?? iv.createdAt),
      iv.store?.name ?? answersByKey.get("store_name") ?? "",
      iv.verdict ? VERDICT_LABELS[iv.verdict] ?? iv.verdict : "",
      willingnessKey ? WILLING_LABELS[willingnessKey] : willingness,
      answersByKey.get("suggested_commission") ?? "",
      iv.summary ?? "",
      ...QUESTIONS.map((q) => answersByKey.get(q.key) ?? ""),
    ]);
  }

  return rows;
}