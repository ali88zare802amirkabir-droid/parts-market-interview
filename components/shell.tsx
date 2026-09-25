"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CarFront,
  ClipboardList,
  LogOut,
  Plus,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "داشبورد", icon: BarChart3, exact: true },
  { href: "/dashboard", label: "تحلیل", icon: Wrench },
  { href: "/interviews", label: "مصاحبه‌ها", icon: ClipboardList },
  { href: "/interview/new", label: "مصاحبه جدید", icon: Plus },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 pb-24 pt-20 sm:px-5 sm:pb-10">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-hairline bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-contrast shadow-card">
              <CarFront size={19} />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold">پژوهش بازار لوازم یدکی</div>
              <div className="text-[11px] text-faint">Market Research</div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="خروج"
              title="خروج"
              className="btn btn-ghost !px-2.5 !py-2"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          {LINKS.map((l) => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-contrast"
                    : "text-soft hover:bg-surface-muted",
                )}
              >
                <l.icon size={15} />
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mr-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-danger sm:hidden"
          >
            <LogOut size={15} />
            خروج
          </button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 border-t border-hairline pb-2 pt-5 text-center text-xs text-faint">
        ابزار تحقیق بازار برای بازارگاه لوازم یدکی خودرو
      </footer>
    </div>
  );
}