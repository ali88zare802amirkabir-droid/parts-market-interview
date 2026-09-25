"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { InterviewForm } from "@/components/interview/interview-form";
import { ErrorState, Skeleton } from "@/components/ui";
import { useJson } from "@/components/use-api";
import { answersFromRows } from "@/lib/answers";
import type { InterviewRow } from "@/lib/dashboard";

export default function EditInterviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, loading, error, refresh } = useJson<{ interview: InterviewRow }>(
    id ? `/api/interviews/${id}` : null,
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/interviews" className="flex w-fit items-center gap-1.5 text-sm text-soft hover:text-primary">
          <ArrowLeft size={15} /> فهرست مصاحبه‌ها
        </Link>
        <ErrorState
          title={error?.includes("یافت نشد") ? "مصاحبه یافت نشد" : "خطا در دریافت مصاحبه"}
          description={error ?? ""}
          onRetry={refresh}
        />
      </div>
    );
  }

  const map = answersFromRows(data.interview.answers);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href={`/interviews/${id}`} className="flex w-fit items-center gap-1.5 text-sm text-soft hover:text-primary">
          <ArrowLeft size={15} /> بازگشت به جزئیات
        </Link>
        <span className="badge badge-primary">
          <Pencil size={12} /> حالت ویرایش
        </span>
      </div>
      <InterviewForm
        interviewId={id}
        initialAnswers={map}
        initialVerdict={data.interview.verdict}
        initialSummary={data.interview.summary ?? ""}
      />
    </div>
  );
}