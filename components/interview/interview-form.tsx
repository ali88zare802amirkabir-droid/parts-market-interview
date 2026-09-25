"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CloudAlert,
  Eraser,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  QUESTIONS,
  STEP_COUNT,
  STEP_TITLES,
  getQuestion,
  isQuestionVisible,
} from "@/lib/questions";
import {
  validateStep,
  validateAll,
  type AnswerMap,
} from "@/lib/validate";
import { displayAnswer } from "@/lib/answers";
import { renderField } from "@/components/form-fields";
import { Spinner } from "@/components/ui";
import { cn, parseFaNumber, toFa } from "@/lib/utils";

export interface InterviewFormProps {
  interviewId?: string;
  initialAnswers?: AnswerMap;
  initialVerdict?: string | null;
  initialSummary?: string;
}

export function InterviewForm({
  interviewId,
  initialAnswers,
  initialVerdict = null,
  initialSummary = "",
}: InterviewFormProps) {
  const router = useRouter();
  const isEdit = Boolean(interviewId);

  const [step, setStep] = React.useState(1);
  const [answers, setAnswers] = React.useState<AnswerMap>(initialAnswers ?? {});
  const [verdict, setVerdict] = React.useState<string>(initialVerdict ?? "");
  const [summary, setSummary] = React.useState<string>(initialSummary);
  const [stepErrors, setStepErrors] = React.useState<Record<number, Record<string, string>>>({});
  const [liveErrors, setLiveErrors] = React.useState<Record<string, string>>({});
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sheetsWarning, setSheetsWarning] = React.useState<boolean>(false);
  const [done, setDone] = React.useState(false);
  const [savedId, setSavedId] = React.useState<string | null>(null);

  const draftKey = interviewId ? `mi_draft_${interviewId}` : "mi_draft_new";

  const stepQuestions = React.useMemo(
    () =>
      QUESTIONS.filter((q) => q.step === step && isQuestionVisible(q, answers)),
    [step, answers],
  );

  // Step-1 questions may include the store name — auto-collect for the header.
  const storeName = typeof answers.store_name === "string" ? answers.store_name : "";

  function updateAnswer(key: string, value: string | string[]) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setLiveErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setStepErrors((prev) => {
      const q = getQuestion(key);
      if (!q) return prev;
      const stepErr = prev[q.step];
      if (!stepErr || !(key in stepErr)) return prev;
      const next: Record<string, string> = { ...stepErr };
      delete next[key];
      return { ...prev, [q.step]: next };
    });
  }

  // ---------------------------------------------------------------- drafts
  React.useEffect(() => {
    if (isEdit) return; // edit preloads real data, avoid clobbering
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { answers?: AnswerMap; updatedAt?: number };
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          setAnswers(parsed.answers);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ answers, updatedAt: Date.now() }),
        );
        setDraftSavedAt("حالا");
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [answers, draftKey, isEdit]);

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftSavedAt(null);
  }

  // ---------------------------------------------------------------- step nav
  function goTo(stepTo: number) {
    setStep(stepTo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateCurrentStep(): boolean {
    if (step > STEP_COUNT) return true;
    const { ok, errors } = validateStep(step, answers);
    if (!ok) {
      setStepErrors((prev) => ({ ...prev, [step]: errors }));
      setLiveErrors((prev) => ({ ...prev, ...errors }));
    }
    return ok;
  }

  function onNext() {
    setServerError(null);
    if (!validateCurrentStep()) return;
    goTo(step + 1);
  }

  function onBack() {
    if (step === 1) {
      router.push("/interviews");
      return;
    }
    goTo(step - 1);
  }

  function jumpTo(stepTo: number) {
    goTo(stepTo);
  }

  // ---------------------------------------------------------------- review data
  const reviewGroups = React.useMemo(() => {
    const groups: {
      step: number;
      title: string;
      items: { key: string; label: string; display: string | null; missing: boolean }[];
    }[] = [];
    for (let s = 1; s <= STEP_COUNT; s++) {
      const items = QUESTIONS.filter(
        (q) => q.step === s && isQuestionVisible(q, answers),
      ).map((q) => {
        const raw = answers[q.key];
        const empty =
          raw === undefined ||
          raw === null ||
          raw === "" ||
          (Array.isArray(raw) && raw.length === 0);
        const display = empty ? null : displayAnswer(q, raw as never);
        return {
          key: q.key,
          label: q.label,
          display,
          missing: empty && q.required,
        };
      });
      groups.push({ step: s, title: STEP_TITLES[s], items });
    }
    return groups;
  }, [answers]);

  const reviewMissingCount = React.useMemo(
    () => reviewGroups.flatMap((g) => g.items).filter((i) => i.missing).length,
    [reviewGroups],
  );

  // ---------------------------------------------------------------- submit
  const buildPayload = () => {
    const store = {
      name: typeof answers.store_name === "string" ? answers.store_name.trim() : "",
      activityType: typeof answers.activity_type === "string" ? answers.activity_type : "",
      yearsActive: typeof answers.years_active === "string" ? answers.years_active : "",
      productCount:
        typeof answers.product_count === "string" && answers.product_count.length > 0
          ? parseFaNumber(answers.product_count)
          : null,
      carBrands: Array.isArray(answers.car_brands) ? answers.car_brands : [],
    };
    // Send raw answers; server normalizes & validates against the catalog.
    const rawAnswers: Record<string, string | string[]> = {};
    for (const q of QUESTIONS) {
      if (!isQuestionVisible(q, answers)) continue;
      const v = answers[q.key];
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      rawAnswers[q.key] = typeof v === "number" ? String(v) : v;
    }
    return { store, answers: rawAnswers, verdict, summary };
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setServerError(null);
    setSheetsWarning(false);

    const errors = validateAll(answers);
    if (Object.keys(errors).length > 0) {
      const grouped: Record<number, Record<string, string>> = {};
      for (const [key, msg] of Object.entries(errors)) {
        const q = getQuestion(key);
        const s = q?.step ?? 1;
        grouped[s] = { ...(grouped[s] ?? {}), [key]: msg };
      }
      setStepErrors(grouped);
      setLiveErrors(errors);
      goTo(firstErroredStep(grouped));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/interviews/${interviewId}` : "/api/interviews", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setServerError(json?.error ?? "ذخیره مصاحبه با خطا مواجه شد.");
        setSubmitting(false);
        return;
      }
      clearDraft();
      setSheetsWarning(Boolean(json?.data?.sheetsWarning));
      setSavedId(json?.data?.id ?? interviewId ?? null);
      setDone(true);
    } catch {
      setServerError("ذخیره مصاحبه با خطا مواجه شد. وضعیت اتصال را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  function firstErroredStep(grouped: Record<number, unknown>): number {
    for (let s = 1; s <= STEP_COUNT; s++) {
      if (grouped[s]) return s;
    }
    return 1;
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-lg font-extrabold">مصاحبه {isEdit ? "ویرایش شد" : "ثبت شد"} با موفقیت</h1>
        <p className="mt-1 text-sm text-soft">
          پاسخ‌ها در پایگاه داده ذخیره شدند.
        </p>
        {sheetsWarning ? (
          <p className="mx-auto mt-3 flex max-w-sm items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
            <CloudAlert size={16} className="mt-0.5 shrink-0" />
            مصاحبه با موفقیت ذخیره شد، اما همگام‌سازی با Google Sheets انجام نشد.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => router.push(`/interviews/${savedId}`)}>
            مشاهده مصاحبه
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/interview/new")}>
            مصاحبه جدید
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/interviews")}>
            فهرست مصاحبه‌ها
          </button>
        </div>
      </div>
    );
  }

  const isReview = step > STEP_COUNT;

  return (
    <div className="flex flex-col gap-3">
      {/* progress */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-faint">مرحله {toFa(isReview ? STEP_COUNT + 1 : step)} از {toFa(STEP_COUNT + 1)}</span>
          <h1 className="mt-0.5 text-lg font-extrabold">
            {isReview ? "مرور و ثبت" : STEP_TITLES[step]}{" "}
            {storeName ? <span className="text-faint">— {storeName}</span> : null}
          </h1>
        </div>
        {draftSavedAt ? (
          <span className="badge badge-neutral shrink-0" title="پیش‌نویس به‌صورت خودکار در این دستگاه ذخیره می‌شود">
            پیش‌نویس ذخیره شد
          </span>
        ) : null}
      </div>

      {/* step dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: STEP_COUNT + 1 }, (_, i) => i + 1).map((s) => {
          const isCurrent = s === step;
          const hasError = stepErrors[s] && Object.keys(stepErrors[s]).length > 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => (s <= step ? jumpTo(s) : undefined)}
              aria-label={`مرحله ${s}`}
              className={cn(
                "flex h-2 flex-1 rounded-full transition-all",
                isCurrent
                  ? "bg-primary"
                  : hasError
                    ? "bg-danger/60"
                    : s < step
                      ? "bg-primary/40"
                      : "bg-surface-muted",
              )}
            />
          );
        })}
      </div>

      {serverError ? (
        <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertTriangle size={16} className="shrink-0" />
          {serverError}
        </p>
      ) : null}

      {/* ------------------------------------------------ review view */}
      {isReview ? (
        <ReviewPanel
          groups={reviewGroups}
          missingCount={reviewMissingCount}
          verdict={verdict}
          setVerdict={setVerdict}
          summary={summary}
          setSummary={setSummary}
          onJump={jumpTo}
        />
      ) : (
        <div className="card flex flex-col gap-5 p-4 sm:p-5">
          {stepQuestions.map((q) =>
            renderField(
              q,
              answers[q.key] as string | string[] | undefined,
              (v) => updateAnswer(q.key, v),
              (liveErrors[q.key] ?? stepErrors[step]?.[q.key]),
            ),
          )}
        </div>
      )}

      {/* bottom actions — fixed on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/85 p-3 backdrop-blur-xl sm:sticky sm:bottom-4 sm:z-0 sm:mt-2 sm:rounded-2xl sm:border sm:bg-surface sm:p-2.5">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 sm:max-w-none">
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={submitting}>
            <ArrowRight size={18} /> {step === 1 ? "بازگشت به فهرست" : "قبلی"}
          </button>

          {isReview ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Spinner size={18} /> : <Save size={18} />}
              {isEdit ? "ثبت ویرایش‌ها" : "ثبت مصاحبه"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNext}
              disabled={submitting}
            >
              {step === STEP_COUNT ? "مرور پاسخ‌ها" : "بعدی"} <ArrowLeft size={18} />
            </button>
          )}

          {!isEdit ? (
            <button
              type="button"
              className="btn btn-ghost !px-2.5"
              onClick={clearDraft}
              title="پاک کردن پیش‌نویس"
              aria-label="پاک کردن پیش‌نویس"
              disabled={submitting}
            >
              <Eraser size={16} />
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({
  groups,
  missingCount,
  verdict,
  setVerdict,
  summary,
  setSummary,
  onJump,
}: {
  groups: {
    step: number;
    title: string;
    items: { key: string; label: string; display: string | null; missing: boolean }[];
  }[];
  missingCount: number;
  verdict: string;
  setVerdict: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {missingCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            const first = groups.find((g) => g.items.some((i) => i.missing));
            if (first) onJump(first.step);
          }}
          className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning"
        >
          <AlertTriangle size={16} className="shrink-0" />
          {toFa(missingCount)} پاسخ الزامی‌ به دلیل شرایط شاخه‌ای هنوز خالی است — برای تکمیل بزنید.
        </button>
      ) : null}

      {groups.map((group) => {
        const visible = group.items;
        const hasContent = visible.some((i) => i.display);
        if (!hasContent && group.items.some((i) => !i.missing)) return null;
        return (
          <div key={group.step} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline bg-surface-muted/60 px-4 py-2.5">
              <h3 className="text-sm font-bold">{group.title}</h3>
              <button
                type="button"
                onClick={() => onJump(group.step)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary-soft"
              >
                <RotateCcw size={13} /> ویرایش
              </button>
            </div>
            <div className="divide-y divide-hairline">
              {visible
                .filter((i) => !i.missing || i.display)
                .map((item) => (
                  <div key={item.key} className="flex flex-col gap-0.5 px-4 py-2.5">
                    <span className="text-xs text-faint">{item.label}</span>
                    <span className="text-[15px] font-medium leading-6">{item.display ?? "—"}</span>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      <div className="card flex flex-col gap-4 p-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[15px] font-semibold">نظر نهایی مصاحبه‌گر</label>
            <span className="text-xs text-faint">اختیاری</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { v: "POSITIVE", label: "مثبت" },
              { v: "MIXED", label: "خنثی / با تردید" },
              { v: "NEGATIVE", label: "منفی" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setVerdict(verdict === o.v ? "" : o.v)}
                className={cn(
                  "radio-card !justify-center !py-2.5 !text-sm",
                  verdict === o.v && "radio-card-selected",
                )}
              >
                <Check size={16} className={cn("shrink-0", verdict === o.v ? "" : "opacity-0")} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[15px] font-semibold">خلاصه / یادداشت مصاحبه‌گر</label>
          <textarea
            className="field"
            rows={3}
            value={summary}
            placeholder="برداشت کلی، نکات مهم، قول‌ها و…"
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}