"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InterviewForm } from "@/components/interview/interview-form";

export default function NewInterviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/interviews" className="flex w-fit items-center gap-1.5 text-sm text-soft hover:text-primary">
        <ArrowLeft size={15} /> فهرست مصاحبه‌ها
      </Link>
      <InterviewForm />
    </div>
  );
}