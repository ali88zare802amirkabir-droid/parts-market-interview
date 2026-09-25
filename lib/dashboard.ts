import { safeJsonParse } from "@/lib/utils";
import type { AnswerValue } from "@/lib/validate";

export interface AnswerRow {
  questionKey: string;
  answer?: string | number | null;
  answerData?: string | null;
}

export interface StoreRow {
  name: string;
  activityType?: string;
  yearsActive?: string;
  productCount?: number;
  carBrands?: string[];
}

export interface NoteRow {
  id: string;
  content: string;
  createdAt: Date;
}

export interface InterviewRow {
  id: string;
  code: number;
  status: string;
  verdict: string | null;
  summary?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  store?: StoreRow | null;
  notes?: NoteRow[];
  answers: AnswerRow[];
}

export type Willingness = "yes" | "maybe" | "no";

/** Maps the answer to Q39 (will you register?) to a willingness bucket. */
export function willingnessBucket(value: string | undefined | null): Willingness | null {
  if (!value) return null;
  if (value === "yes") return "yes";
  if (value === "maybe" || value === "unsure") return "maybe";
  if (value === "no") return "no";
  return null;
}

/** Read a typed answer value by key from an interview. */
export function answerValue<T extends AnswerValue = AnswerValue>(
  interview: InterviewRow,
  key: string,
): T | undefined {
  const row = interview.answers?.find((a) => a.questionKey === key);
  if (!row) return undefined;
  if (row.answerData) {
    const parsed = safeJsonParse<T>(row.answerData);
    if (parsed !== null) return parsed;
  }
  return (row.answer as T) ?? undefined;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function labelCounts(
  interviews: InterviewRow[],
  key: string,
  labelsFromValue?: (v: string) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const iv of interviews) {
    const value = answerValue<string | string[]>(iv, key);
    if (Array.isArray(value)) {
      for (const v of value) {
        const label = labelsFromValue ? labelsFromValue(v) : v;
        counts[label] = (counts[label] ?? 0) + 1;
      }
    } else if (typeof value === "string" && value) {
      const label = labelsFromValue ? labelsFromValue(value) : value;
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Keyword-based categorization of the free-text "biggest problem" answers.
// ---------------------------------------------------------------------------
const PROBLEM_RULES: { label: string; keywords: string[] }[] = [
  { label: "یافتن قطعه نایاب / تأمین", keywords: ["قطعه", "تأمین", "تامین", "نایاب", "کمبود", "نداشتن", "موجود", "پیدا"] },
  { label: "مشتری‌یابی و مشتری", keywords: ["مشتری", "فروش", "مشتری‌ها", "رابط"] },
  { label: "قیمت و رقابت", keywords: ["قیمت", "رقابت", "گران", "سود"] },
  { label: "فضا و انبار", keywords: ["فضا", "انبار", "مکان", "مساحت"] },
  { label: "نیروی کار", keywords: ["نیرو", "کارمند", "پرسنل", "فروشنده"] },
  { label: "مالی و حسابداری", keywords: ["مالی", "حساب", "کتاب", "بده", "حسابداری"] },
  { label: "رکود بازار", keywords: ["رکود", "بازار", "تقاضا", "اقتصاد"] },
];

export function categorizeProblem(text: string): string {
  if (!text?.trim()) return "سایر";
  const normalized = text.trim().toLowerCase();
  const best = PROBLEM_RULES.find((rule) =>
    rule.keywords.some((k) => normalized.includes(k.toLowerCase())),
  );
  return best?.label ?? "سایر";
}

// ---------------------------------------------------------------------------
// Main dashboard computation.
// ---------------------------------------------------------------------------
export interface DashboardStats {
  totalInterviews: number;
  totalStores: number;
  completedInterviews: number;
  willingness: { yes: number; maybe: number; no: number; unanswered: number };
  willingnessRate: number | null; // percent (yes + maybe) of answered
  averageCommission: number | null;
  medianCommission: number | null;
  commissionDistribution: { bucket: string; count: number }[];
  businessModel: Record<string, number>;
  paymentModel: Record<string, number>;
  deliveryMethod: Record<string, number>;
  problems: Record<string, number>;
  recentInterviews: {
    id: string;
    code: number;
    name: string;
    date: string;
    willingness: Willingness | null;
    commission: number | null;
  }[];
}

const DISTRIBUTION_BUCKETS: { label: string; max: number }[] = [
  { label: "عدم تمایل (بدون پاسخ)", max: -1 }, // handled specially
  { label: "۰٪", max: 0 },
  { label: "۱ تا ۵٪", max: 5 },
  { label: "۶ تا ۱۰٪", max: 10 },
  { label: "۱۱ تا ۲۰٪", max: 20 },
  { label: "بیش از ۲۰٪", max: Infinity },
];

function commissionBucket(value: number | undefined): string {
  const bucket = DISTRIBUTION_BUCKETS.find(
    (b) => b.max === Infinity ? value !== undefined && value > 20 : b.max >= (value ?? -2),
  );
  return bucket?.label ?? "نامشخص";
}

const MODEL_LABELS: Record<string, string> = {
  commission: "درصد از فروش",
  subscription: "اشتراک",
  fixed: "مبلغ ثابت",
  hybrid: "ترکیبی",
  dont_know: "نمی‌دانم",
};

const PAYMENT_LABELS: Record<string, string> = {
  yes: "بله",
  no: "خیر",
  depends: "بسته به مبلغ",
};

const DELIVERY_LABELS: Record<string, string> = {
  in_person: "دریافت حضوری",
  garage: "ارسال به تعمیرگاه",
  post: "پست",
  courier: "پیک",
  depends: "بستگی به مشتری",
};

export function computeDashboard(interviews: InterviewRow[]): DashboardStats {
  const answered = interviews.filter((iv) => iv.answers?.length > 0);

  const willingness = { yes: 0, maybe: 0, no: 0, unanswered: 0 };
  for (const iv of interviews) {
    const bucket = willingnessBucket(answerValue<string>(iv, "will_register"));
    if (bucket === "yes") willingness.yes++;
    else if (bucket === "maybe") willingness.maybe++;
    else if (bucket === "no") willingness.no++;
    else willingness.unanswered++;
  }
  const willingnessAnswered = willingness.yes + willingness.maybe + willingness.no;
  const willingnessRate =
    willingnessAnswered > 0
      ? Math.round(((willingness.yes + willingness.maybe) / willingnessAnswered) * 100)
      : null;

  const commissions = answered
    .map((iv) => {
      const v = answerValue<number>(iv, "suggested_commission");
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    })
    .filter((v): v is number => v !== null);

  const commissionDistribution: Record<string, number> = {};
  for (const iv of interviews) {
    const v = answerValue<number>(iv, "suggested_commission");
    const willing = willingnessBucket(answerValue<string>(iv, "will_register"));
    const value =
      typeof v === "number" && Number.isFinite(v) ? v : willing === "no" ? undefined : undefined;
    const bucket = typeof value === "number" ? commissionBucket(value) : "عدم تمایل (بدون پاسخ)";
    commissionDistribution[bucket] = (commissionDistribution[bucket] ?? 0) + 1;
  }

  const businessModel = labelCounts(answered, "revenue_model", (v) => MODEL_LABELS[v] ?? v);
  const paymentModel = labelCounts(answered, "prepay_ok", (v) => PAYMENT_LABELS[v] ?? v);
  const deliveryMethod = labelCounts(answered, "delivery_preference", (v) => DELIVERY_LABELS[v] ?? v);

  const problems: Record<string, number> = {};
  for (const iv of answered) {
    const text = answerValue<string>(iv, "biggest_problem");
    if (typeof text === "string" && text.trim()) {
      const cat = categorizeProblem(text);
      problems[cat] = (problems[cat] ?? 0) + 1;
    }
  }

  const itemsWithoutCommission = interviews.length - commissions.length;

  const recentInterviews = interviews
    .slice()
    .sort((a, b) => (b.completedAt ?? b.createdAt).getTime() - (a.completedAt ?? a.createdAt).getTime())
    .slice(0, 8)
    .map((iv) => {
      const c = answerValue<number>(iv, "suggested_commission");
      return {
        id: iv.id,
        code: iv.code,
        name: iv.store?.name ?? "بدون نام",
        date: (iv.completedAt ?? iv.createdAt).toISOString(),
        willingness: willingnessBucket(answerValue<string>(iv, "will_register")),
        commission: typeof c === "number" ? c : null,
      };
    });

  return {
    totalInterviews: interviews.length,
    totalStores: interviews.filter((iv) => iv.store).length,
    completedInterviews: interviews.filter((iv) => iv.status === "COMPLETED").length,
    willingness,
    willingnessRate,
    averageCommission: commissions.length
      ? Math.round((commissions.reduce((s, v) => s + v, 0) / commissions.length) * 10) / 10
      : null,
    medianCommission: median(commissions),
    commissionDistribution: Object.entries(commissionDistribution)
      .map(([bucket, count]) => ({ bucket, count }))
      .sort(
        (a, b) => DISTRIBUTION_BUCKETS.findIndex((d) => d.label === a.bucket) - DISTRIBUTION_BUCKETS.findIndex((d) => d.label === b.bucket),
      ),
    businessModel,
    paymentModel,
    deliveryMethod,
    problems,
    recentInterviews,
    // kept for clarity of derivation
    ...(itemsWithoutCommission > 0 ? {} : {}),
  };
}