"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Download,
  Microscope,
  Plus,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  TrendingUp,
} from "lucide-react";
import { ErrorState, Spinner, StatCard } from "@/components/ui";
import { useJson } from "@/components/use-api";
import type { DashboardStats } from "@/lib/dashboard";
import { formatPersianDate, toFa } from "@/lib/utils";

export default function HomePage() {
  const { data, loading, error, refresh } = useJson<{ stats: DashboardStats }>(
    "/api/dashboard/stats",
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="badge badge-primary w-fit">
              <Microscope size={13} />
              فاز تحقیق بازار
            </span>
            <h1 className="text-xl font-extrabold leading-8 sm:text-2xl">
              بازارگاه تخصصی لوازم یدکی خودرو
            </h1>
            <p className="max-w-md text-sm leading-6 text-soft">
              با فروشندگان واقعی مصاحبه کنید، مشکلات و ترجیح‌هایشان را ثبت کنید و
              بر اساس داده واقعی تصمیم بگیرید.
            </p>
          </div>
          <Sparkles className="shrink-0 text-primary/70" size={26} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/interview/new" className="btn btn-primary">
            <Plus size={18} /> مصاحبه جدید
          </Link>
          <Link href="/interviews" className="btn btn-ghost">
            <ClipboardList size={18} /> مشاهده مصاحبه‌ها
          </Link>
          <Link href="/dashboard" className="btn btn-soft">
            <BarChart3 size={18} /> داشبورد تحلیل
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      ) : null}

      {error ? (
        <ErrorState
          title="در بارگذاری آمار خطایی رخ داد"
          description={error}
          onRetry={refresh}
        />
      ) : null}

      {data?.stats && !loading ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="کل مصاحبه‌ها"
              value={toFa(data.stats.totalInterviews)}
              icon={<ClipboardList size={18} />}
              sub={`${toFa(data.stats.completedInterviews)} تکمیل‌شده`}
            />
            <StatCard
              label="فروشندگان"
              value={toFa(data.stats.totalStores)}
              icon={<StoreIcon size={18} />}
            />
            <StatCard
              label="موافقان استفاده"
              value={
                data.stats.willingnessRate === null
                  ? "—"
                  : toFa(data.stats.willingnessRate) + "٪"
              }
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label="میانگین کمیسیون"
              value={
                data.stats.averageCommission === null
                  ? "—"
                  : toFa(data.stats.averageCommission) + "٪"
              }
              icon={<ShoppingBag size={18} />}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">مصاحبه‌های اخیر</h2>
              <Link href="/interviews" className="flex items-center gap-1 text-sm text-primary">
                همه <ArrowLeft size={15} />
              </Link>
            </div>

            {data.stats.recentInterviews.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 p-8 text-center">
                <p className="text-sm text-soft">هنوز مصاحبه‌ای ثبت نشده است.</p>
                <Link href="/interview/new" className="btn btn-primary mt-1">
                  <Plus size={16} /> اولین مصاحبه را ثبت کنید
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.stats.recentInterviews.map((iv) => (
                  <Link
                    key={iv.id}
                    href={`/interviews/${iv.id}`}
                    className="card flex items-center justify-between gap-3 px-4 py-3 transition-transform active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-bold">{iv.name}</span>
                      <span className="text-xs text-faint">
                        مصاحبه {toFa(iv.code)} — {formatPersianDate(iv.date)}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={
                          iv.willingness === "yes"
                            ? "badge badge-success"
                            : iv.willingness === "maybe"
                              ? "badge badge-warning"
                              : iv.willingness === "no"
                                ? "badge badge-danger"
                                : "badge badge-neutral"
                        }
                      >
                        {iv.willingness === "yes"
                          ? "موافق"
                          : iv.willingness === "maybe"
                            ? "شاید"
                            : iv.willingness === "no"
                              ? "مخالف"
                              : "نامشخص"}
                      </span>
                      {iv.commission !== null ? (
                        <span className="text-xs font-bold text-soft">{toFa(iv.commission)}٪</span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <a href="/api/export/csv" className="btn btn-ghost">
              <Download size={18} /> خروجی CSV
            </a>
          </div>
        </>
      ) : null}

      {!loading && !error && !data ? (
        <p className="flex items-center gap-2 text-sm text-soft">
          <Spinner size={16} /> در حال آماده‌سازی… 
        </p>
      ) : null}
    </div>
  );
}