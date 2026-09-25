"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CloudAlert,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import {
  ConfirmDialog,
  ErrorState,
  Skeleton,
  Spinner,
} from "@/components/ui";
import { useJson } from "@/components/use-api";
import { QUESTION_MAP, STEP_COUNT, STEP_TITLES } from "@/lib/questions";
import type { InterviewRow, NoteRow } from "@/lib/dashboard";
import { cn, formatDateTimeFa, formatPersianDate, toFa } from "@/lib/utils";

const VERDICT_LABEL: Record<string, string> = {
  POSITIVE: "مثبت",
  MIXED: "خنثی / با تردید",
  NEGATIVE: "منفی",
};

const companyLabel = (key: string, value: string | null) => {
  if (!value) return "—";
  const q = QUESTION_MAP.get(key);
  const opt = q?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
};

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, loading, error, refresh } = useJson<{ interview: InterviewRow }>(
    id ? `/api/interviews/${id}` : null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [noteError, setNoteError] = React.useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "خطا در حذف.");
      router.replace("/interviews");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در حذف.");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  async function addNote() {
    const content = noteText.trim();
    if (!content) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/interviews/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "خطا در افزودن یادداشت.");
      setNoteText("");
      refresh();
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "خطا در افزودن یادداشت.");
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/interviews" className="flex w-fit items-center gap-1.5 text-sm text-soft hover:text-primary">
          <ArrowLeft size={15} /> فهرست مصاحبه‌ها
        </Link>
        <ErrorState title="خطا در دریافت مصاحبه" description={error ?? ""} onRetry={refresh} />
      </div>
    );
  }

  const iv = data.interview;
  const store = iv.store;
  const answerMap = new Map(iv.answers.map((a) => [a.questionKey, a.answer]));

  const groups: { step: number; title: string; rows: { key: string }[] }[] = [];
  for (let s = 1; s <= STEP_COUNT; s++) {
    const rows = iv.answers.filter((a) => QUESTION_MAP.get(a.questionKey)?.step === s);
    if (rows.length === 0) continue;
    groups.push({
      step: s,
      title: STEP_TITLES[s],
      rows: rows.map((a) => ({ key: a.questionKey })),
    });
  }

  const displayValue = (key: string): string => {
    const row = iv.answers.find((a) => a.questionKey === key);
    if (!row) return "—";
    const q = QUESTION_MAP.get(key);
    if (q?.type === "select" || q?.type === "radio") {
      return companyLabel(key, typeof row.answer === "string" ? row.answer : null);
    }
    return row.answer == null ? "—" : String(row.answer);
  };

  const sheetStatus = (iv as InterviewRow & { sheetStatus?: string | null }).sheetStatus ?? "PENDING";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/interviews" className="flex w-fit items-center gap-1.5 text-sm text-soft hover:text-primary">
          <ArrowLeft size={15} /> فهرست
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={`/interview/${iv.id}/edit`}
            className="btn btn-ghost !px-3 !py-2"
            title="ویرایش"
            aria-label="ویرایش"
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">ویرایش</span>
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="btn btn-ghost !px-3 !py-2 hover:!text-danger"
            title="حذف"
            aria-label="حذف"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">حذف</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-surface-muted p-2 text-primary">
                <Store size={18} />
              </span>
              <h1 className="truncate text-xl font-extrabold">{store?.name ?? "بدون نام فروشگاه"}</h1>
            </div>
            <p className="ms-11 text-sm text-soft">
              مصاحبه {toFa(iv.code)} • {store ? companyLabel("activity_type", store.activityType ?? null) : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="badge badge-neutral">
              <CalendarDays size={12} />
              {formatPersianDate(iv.completedAt ?? iv.createdAt)}
            </span>
            {iv.verdict ? (
              <span
                className={cn(
                  "badge",
                  iv.verdict === "POSITIVE"
                    ? "badge-success"
                    : iv.verdict === "NEGATIVE"
                      ? "badge-danger"
                      : "badge-warning",
                )}
              >
                نظر نهایی: {VERDICT_LABEL[iv.verdict] ?? iv.verdict}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="stat-card">
            <div className="text-xs text-faint">سابقه فعالیت</div>
            <div className="mt-1 text-sm font-bold">{companyLabel("years_active", store?.yearsActive ?? null)}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-faint">انواع قطعات</div>
            <div className="mt-1 text-sm font-bold tabular-nums">
              {store?.productCount != null ? toFa(store.productCount) : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-faint">خودروهای اصلی</div>
            <div className="mt-1 truncate text-sm font-bold">
              {Array.isArray(store?.carBrands) && store!.carBrands!.length
                ? store!.carBrands!.map((b) => companyLabel("car_brands", b)).join("، ")
                : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-faint">همگام‌سازی Sheets</div>
            <div className="mt-1">
              {sheetStatus === "SYNCED" ? (
                <span className="badge badge-success">
                  <CheckCircle2 size={12} /> همگام شد
                </span>
              ) : sheetStatus === "FAILED" ? (
                <span className="badge badge-danger">
                  <CloudAlert size={12} /> ناموفق
                </span>
              ) : (
                <span className="badge badge-neutral">در انتظار</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Answers by step */}
      {groups.map((g) => (
        <section key={g.step} className="card overflow-hidden">
          <div className="border-b border-hairline bg-surface-muted/60 px-4 py-2.5">
            <h2 className="text-sm font-bold">مرحله {toFa(g.step)} — {g.title}</h2>
          </div>
          <div className="divide-y divide-hairline">
            {g.rows.map(({ key }) => (
              <div key={key} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="text-xs text-faint">
                  {QUESTION_MAP.get(key)?.label ?? key}
                  {ANSWER_IMPORTANT.has(key) ? " ⭐" : ""}
                </span>
                <span className="whitespace-pre-wrap text-[15px] leading-6">{displayValue(key)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Free-form summary */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">خلاصه / نظر مصاحبه‌گر</h2>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-soft">
          {iv.summary?.trim() ? iv.summary : "—"}
        </p>
      </section>

      {/* Notes */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">یادداشت‌های مصاحبه‌گر</h2>
        <div className="mt-3 flex flex-col gap-3">
          <NoteList notes={iv.notes ?? []} />
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="افزودن یادداشت…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNote();
              }}
            />
            <button type="button" className="btn btn-primary" onClick={addNote} disabled={!noteText.trim() || noteBusy}>
              {noteBusy ? <Spinner size={16} /> : <Plus size={16} />}
              افزودن
            </button>
          </div>
          {noteError ? <p className="text-sm text-danger">{noteError}</p> : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="حذف مصاحبه"
        message="همه پاسخ‌ها و یادداشت‌های این مصاحبه برای همیشه حذف می‌شوند. ادامه می‌دهید؟"
        confirmLabel="حذف"
        busy={deleting}
      />
    </div>
  );
}

const ANSWER_IMPORTANT = new Set(["biggest_problem", "one_problem_to_solve", "willing_pay_platform", "suggested_commission"]);

function NoteList({ notes }: { notes: NoteRow[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-faint">یادداشتی ثبت نشده است.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {notes.map((n) => (
        <div key={n.id} className="rounded-xl border border-hairline bg-surface-muted/50 px-3 py-2">
          <p className="whitespace-pre-wrap text-sm leading-6">{n.content}</p>
          <span className="mt-1 block text-[11px] text-faint">{formatDateTimeFa(n.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}