import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert English/Latin digits inside a string to Persian digits. */
export function toFa(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Convert Persian (and Arabic-Indic) digits inside a string to Latin digits. */
export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Parse a Persian-digit string into a JS number. */
export function parseFaNumber(value: string): number {
  const normalized = value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[۰-۹٠-٩]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const parsed = Number(normalized.trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Format a Date as a Persian (Jalali) date string, e.g. ۲۴ مهر ۱۴۰۵. */
export function formatPersianDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  try {
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formatter.format(d);
  } catch {
    const j = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(d);
    const y = j.find((p) => p.type === "year")?.value ?? "";
    const m = (Number(j.find((p) => p.type === "month")?.value) ?? 1) - 1;
    const day = j.find((p) => p.type === "day")?.value ?? "";
    return `${toFa(day)} ${PERSIAN_MONTHS[m] ?? ""} ${toFa(y)}`;
  }
}

export function formatDateTimeFa(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${formatPersianDate(d)}، ${time}`;
}

/** Safely parse a JSON string to an unknown value. */
export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Safely stringify to a JSON string (or null). */
export function safeJsonStringify(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}