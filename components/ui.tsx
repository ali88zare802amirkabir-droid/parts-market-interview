"use client";

import * as React from "react";
import {
  AlertTriangle,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { cn, toFa } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-muted",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-surface/50 px-6 py-14 text-center">
      <div className="rounded-2xl bg-surface-muted p-4 text-faint">
        {icon ?? <Inbox size={28} />}
      </div>
      <div className="text-base font-bold">{title}</div>
      {description ? <p className="max-w-sm text-sm text-soft">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "خطایی رخ داد",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-hairline bg-surface px-6 py-14 text-center">
      <div className="rounded-2xl bg-danger-soft p-4 text-danger">
        <AlertTriangle size={28} />
      </div>
      <div className="text-base font-bold">{title}</div>
      {description ? <p className="max-w-sm text-sm text-soft">{description}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn-soft mt-2" onClick={onRetry}>
          <RefreshCw size={16} /> تلاش مجدد
        </button>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(open);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6",
        mounted ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="card w-full max-w-md rounded-b-none bg-surface-solid p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-soft hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>
        <div className="text-sm text-soft">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "حذف",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            انصراف
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner size={16} /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Bar chart — lightweight, CSS-only, RTL-friendly                    */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({
  data,
  max,
  unit = "",
}: {
  data: BarDatum[];
  max?: number;
  unit?: string;
}) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = d.value === 0 ? 0 : Math.max(4, (d.value / peak) * 100);
        return (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-left text-[13px] text-soft">
              {d.label}
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="absolute inset-y-0 right-0 rounded-full bg-primary/80"
                style={{
                  width: `${pct}%`,
                  background: d.color ?? "var(--primary)",
                }}
              />
            </div>
            <div className="w-12 shrink-0 text-left text-[13px] font-bold tabular-nums">
              {toFa(d.value)}{unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat-card flex items-start justify-between gap-2">
      <div>
        <div className="text-[13px] text-soft">{label}</div>
        <div className="mt-1.5 text-2xl font-extrabold tabular-nums">{toFa(value)}</div>
        {sub ? <div className="mt-1 text-xs text-faint">{sub}</div> : null}
      </div>
      {icon ? (
        <div className="rounded-xl bg-primary-soft p-2.5 text-primary">{icon}</div>
      ) : null}
    </div>
  );
}