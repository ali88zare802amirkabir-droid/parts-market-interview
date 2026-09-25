"use client";

import * as React from "react";
import {
  Banknote,
  BrainCircuit,
  Building2,
  PackageOpen,
  Percent,
  PieChart as PieChartIcon,
  Truck,
  UserCheck,
} from "lucide-react";
import { BarChart, ErrorState, StatCard, type BarDatum } from "@/components/ui";
import { useJson } from "@/components/use-api";
import type { DashboardStats } from "@/lib/dashboard";
import { toFa } from "@/lib/utils";

function entriesToBars(record: Record<string, number>, colors?: string[]): BarDatum[] {
  return Object.entries(record).map(([label, value], i) => ({
    label,
    value,
    color: colors?.[i % (colors?.length ?? 1)],
  }));
}

function topLabel(record: Record<string, number>): string | null {
  const entries = Object.entries(record).sort((a, b) => b[1] - a[1]);
  return entries[0] ? `${entries[0][0]} (${toFa(entries[0][1])})` : null;
}

function ChartCard({
  title,
  icon,
  data,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  data: BarDatum[];
  note?: string;
}) {
  return (
    <section className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary-soft p-1.5 text-primary">{icon}</span>
        <h2 className="text-[15px] font-bold">{title}</h2>
        {note ? <span className="badge badge-neutral ms-auto">{note}</span> : null}
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">داده‌ای برای نمایش وجود ندارد.</p>
      ) : (
        <BarChart data={data} unit="" />
      )}
    </section>
  );
}

const WILLING_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#94a3b8"];

export default function DashboardPage() {
  const { data, loading, error, refresh } = useJson<{ stats: DashboardStats }>(
    "/api/dashboard/stats",
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="در بارگذاری آمار خطایی رخ داد"
        description={error ?? ""}
        onRetry={refresh}
      />
    );
  }

  const stats = data.stats;
  const willingnessBars: BarDatum[] = [
    { label: "بله", value: stats.willingness.yes, color: WILLING_COLORS[0] },
    { label: "احتمالاً", value: stats.willingness.maybe, color: WILLING_COLORS[1] },
    { label: "خیر", value: stats.willingness.no, color: WILLING_COLORS[2] },
    { label: "بدون پاسخ", value: stats.willingness.unanswered, color: WILLING_COLORS[3] },
  ];

  const preferredModel = topLabel(stats.businessModel);
  const preferredPayment = topLabel(stats.paymentModel);
  const preferredDelivery = topLabel(stats.deliveryMethod);
  const topProblem = topLabel(stats.problems);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-extrabold">داشبورد تحلیل</h1>
        <p className="mt-0.5 text-sm text-soft">
          نگاهی به داده‌ی جمع‌آوری‌شده از همه مصاحبه‌ها
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="کل مصاحبه‌ها" value={toFa(stats.totalInterviews)} icon={<PackageOpen size={18} />} />
        <StatCard label="فروشندگان" value={toFa(stats.totalStores)} icon={<Building2 size={18} />} />
        <StatCard
          label="میانگین کمیسیون"
          value={stats.averageCommission === null ? "—" : toFa(stats.averageCommission) + "٪"}
          icon={<Percent size={18} />}
        />
        <StatCard
          label="میانه کمیسیون"
          value={stats.medianCommission === null ? "—" : toFa(stats.medianCommission) + "٪"}
          icon={<Banknote size={18} />}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold">نتایج کلیدی</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-sm font-bold">
              <UserCheck size={16} className="text-success" /> ترجیح مدل درآمدی
            </div>
            <div className="mt-1.5 text-lg font-extrabold">{preferredModel ?? "—"}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-sm font-bold">
              <PieChartIcon size={16} className="text-info" /> ترجیح پرداخت قبل از دریافت
            </div>
            <div className="mt-1.5 text-lg font-extrabold">{preferredPayment ?? "—"}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Truck size={16} className="text-primary" /> ترجیح روش دریافت
            </div>
            <div className="mt-1.5 text-lg font-extrabold">{preferredDelivery ?? "—"}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-sm font-bold">
              <BrainCircuit size={16} className="text-warning" /> مهم‌ترین مشکل
            </div>
            <div className="mt-1.5 text-lg font-extrabold">{topProblem ?? "—"}</div>
          </div>
        </div>
      </section>

      <ChartCard
        title="تمایل به استفاده از پلتفرم"
        icon={<UserCheck size={16} />}
        data={willingnessBars}
      />

      <ChartCard
        title="مدل درآمدی قابل قبول"
        icon={<Banknote size={16} />}
        data={entriesToBars(stats.businessModel)}
      />

      <ChartCard
        title="توزیع کمیسیون پیشنهادی"
        icon={<Percent size={16} />}
        data={stats.commissionDistribution.map((c) => ({ label: c.bucket, value: c.count }))}
      />

      <ChartCard
        title="مهم‌ترین مشکلات فروشندگان"
        icon={<BrainCircuit size={16} />}
        data={entriesToBars(stats.problems)}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChartCard
          title="پرداخت قبل از دریافت"
          icon={<Banknote size={16} />}
          data={entriesToBars(stats.paymentModel)}
        />
        <ChartCard
          title="روش دریافت قطعه"
          icon={<Truck size={16} />}
          data={entriesToBars(stats.deliveryMethod)}
        />
      </section>
    </div>
  );
}