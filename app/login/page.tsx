"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CarFront, LockKeyhole, LogIn } from "lucide-react";
import { Spinner } from "@/components/ui";
import { toFa } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "ورود ناموفق بود.");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("ورود ناموفق بود. وضعیت اتصال را بررسی کنید.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-contrast shadow-card">
          <CarFront size={30} />
        </div>
        <h1 className="text-xl font-extrabold">پژوهش بازار لوازم یدکی خودرو</h1>
        <p className="mt-1 text-sm text-soft">
          ابزار ثبت و تحلیل مصاحبه‌های فروشندگان
        </p>
      </div>

      <form onSubmit={submit} className="card flex w-full flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-soft">
          <LockKeyhole size={16} className="text-primary" />
          ورود مدیر
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">نام کاربری</label>
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            dir="ltr"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">رمز عبور</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <button type="submit" className="btn btn-primary mt-1" disabled={busy || !username || !password}>
          {busy ? <Spinner size={18} /> : <LogIn size={18} />}
          ورود
        </button>

        <p className="text-center text-xs text-faint">
          اطلاعات مصاحبه‌ها فقط برای کاربر مجاز در دسترس است.
        </p>
      </form>

      <p className="text-[11px] text-faint">
        نسخه {toFa(1)} — ابزار داخلی تحقیق بازار
      </p>
    </div>
  );
}