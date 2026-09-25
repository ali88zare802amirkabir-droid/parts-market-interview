"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { useJson } from "@/components/use-api";
import type { InterviewRow } from "@/lib/dashboard";
import { cn, formatPersianDate, toFa } from "@/lib/utils";

const VERDICT_LABEL: Record<string, { label: string; cls: string }> = {
  POSITIVE: { label: "مثبت", cls: "badge-success" },
  MIXED: { label: "خنثی", cls: "badge-warning" },
  NEGATIVE: { label: "منفی", cls: "badge-danger" },
};

function willingnessInfo(iv: InterviewRow): { label: string; cls: string } {
  const value = iv.answers?.find((a) => a.questionKey === "will_register")?.answer;
  switch (value) {
    case "بله":
      return { label: "موافق", cls: "badge-success" };
    case "احتمالاً":
    case "نامطمئنم":
      return { label: "شاید", cls: "badge-warning" };
    case "خیر":
      return { label: "مخالف", cls: "badge-danger" };
    default:
      return { label: "نامشخص", cls: "badge-neutral" };
  }
}

function commissionOf(iv: InterviewRow): string | null {
  const row = iv.answers?.find((a) => a.questionKey === "suggested_commission");
  return typeof row?.answer === "string" ? row.answer : null;
}

type SortKey = "date" | "name" | "code" | "commission";
type Order = "asc" | "desc";

export default function InterviewsPage() {
  const [search, setSearch] = React.useState("");
  const [verdict, setVerdict] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("date");
  const [order, setOrder] = React.useState<Order>("desc");
  const [deleteTarget, setDeleteTarget] = React.useState<InterviewRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deletingError, setDeletingError] = React.useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = React.useState("");

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (appliedQuery) params.set("search", appliedQuery);
    if (verdict) params.set("verdict", verdict);
    params.set("sort", sort);
    params.set("order", order);
    return `/api/interviews?${params.toString()}`;
  }, [appliedQuery, verdict, sort, order]);

  const { data, loading, error, refresh } = useJson<{ interviews: InterviewRow[] }>(query);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeletingError(null);
    try {
      const res = await fetch(`/api/interviews/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "خطا در حذف.");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeletingError(err instanceof Error ? err.message : "خطا در حذف.");
    } finally {
      setDeleting(false);
    }
  }

  const focused = Boolean(appliedQuery || verdict);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">مصاحبه‌ها</h1>
          <p className="mt-0.5 text-sm text-soft">جستجو، فیلتر و مدیریت همه مصاحبه‌ها</p>
        </div>
        <Link href="/interview/new" className="btn btn-primary shrink-0">
          <Plus size={18} />
          <span className="hidden sm:inline">مصاحبه جدید</span>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="field !ps-9"
              placeholder="جستجو در نام فروشگاه یا پاسخ‌ها…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAppliedQuery(search.trim());
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setAppliedQuery("");
                }}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-faint hover:bg-surface-muted"
                aria-label="پاک کردن جستجو"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-soft shrink-0"
            onClick={() => setAppliedQuery(search.trim())}
          >
            جستجو
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { value: "", label: "همه نظرها" },
            { value: "POSITIVE", label: "مثبت" },
            { value: "MIXED", label: "خنثی" },
            { value: "NEGATIVE", label: "منفی" },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setVerdict(o.value)}
              className={cn(
                "chip",
                verdict === o.value && "chip-selected",
              )}
            >
              {o.label}
            </button>
          ))}

          <select
            className="chip shrink-0 !cursor-pointer bg-surface"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="مرتب‌سازی"
          >
            <option value="date">تاریخ</option>
            <option value="name">نام فروشگاه</option>
            <option value="code">شماره</option>
            <option value="commission">کمیسیون</option>
          </select>

          <button
            type="button"
            className={cn("chip shrink-0", order === "asc" && "chip-selected")}
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
            aria-label="جهت مرتب‌سازی"
          >
            {order === "asc" ? "صعودی ↑" : "نزولی ↓"}
          </button>

<a
            href={`/api/export/csv${verdict ? `?verdict=${verdict}` : ""}`}
            className="chip shrink-0"
          >
            <Download size={13} /> خروجی CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      ) : null}

      {error ? (
        <ErrorState title="خطا در دریافت مصاحبه‌ها" description={error} onRetry={refresh} />
      ) : null}

      {!loading && !error && data ? (
        data.interviews.length === 0 ? (
          <EmptyState
            title={focused ? "نتیجه‌ای یافت نشد" : "هنوز مصاحبه‌ای ثبت نشده است"}
            description={
              focused
                ? "با جستجو یا فیلتر دیگری تلاش کنید."
                : "اولین مصاحبه را با فروشندگان لوازم یدکی شروع کنید."
            }
            icon={<Mail size={26} />}
            action={
              focused ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setAppliedQuery("");
                    setVerdict("");
                  }}
                >
                  پاک کردن فیلترها
                </button>
              ) : (
                <Link href="/interview/new" className="btn btn-primary">
                  <Plus size={16} /> اولین مصاحبه
                </Link>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {data.interviews.map((iv) => {
              const w = willingnessInfo(iv);
              const v = iv.verdict ? VERDICT_LABEL[iv.verdict] : null;
              const commission = commissionOf(iv);
              return (
                <div
                  key={iv.id}
                  className="card flex items-center gap-3 px-4 py-3"
                >
                  <Link
                    href={`/interviews/${iv.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-1"
                  >
                    <span className="truncate text-[15px] font-bold">
                      {iv.store?.name ?? "بدون نام"}
                    </span>
                    <span className="text-xs text-faint">
                      مصاحبه {toFa(iv.code)} — {formatPersianDate(iv.completedAt ?? iv.createdAt)}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={cn("badge", w.cls)}>{w.label}</span>
                      {v ? <span className={cn("badge", v.cls)}>{v.label}</span> : null}
                      {commission !== null && commission !== undefined ? (
                        <span className="badge badge-primary">{toFa(commission)}٪</span>
                      ) : null}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/interview/${iv.id}/edit`}
                      className="rounded-lg p-2 text-soft hover:bg-surface-muted hover:text-primary"
                      aria-label="ویرایش"
                      title="ویرایش"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(iv)}
                      className="rounded-lg p-2 text-soft hover:bg-danger-soft hover:text-danger"
                      aria-label="حذف"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeletingError(null);
        }}
        onConfirm={confirmDelete}
        title="حذف مصاحبه"
        message={`مصاحبه «${deleteTarget?.store?.name ?? deleteTarget?.code ?? ""}» و همه پاسخ‌های آن برای همیشه حذف می‌شود. مطمئن هستید؟`}
        confirmLabel="حذف"
        busy={deleting}
      />
      {deletingError ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{deletingError}</p>
      ) : null}
    </div>
  );
}