import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { signSessionToken } from "@/lib/auth";

const h = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      h.cookie ? { name: "parts_admin_session", value: h.cookie } : undefined,
  }),
}));

// Simulate a database outage: every Prisma call throws.
vi.mock("@/lib/prisma", () => {
  const fail = async () => {
    throw new Error("connection refused (simulated outage)");
  };
  const delegate = new Proxy(
    {},
    { get: () => fail },
  );
  return {
    prisma: {
      $transaction: async (fn: any) => fn(delegate),
      interview: delegate,
      store: delegate,
      interviewAnswer: delegate,
      interviewNote: delegate,
    },
  };
});

vi.mock("@/lib/sheets", () => ({
  sheetsEnabled: () => false,
  syncInterviewToSheet: async () => ({ ok: false, error: "never reached" }),
  syncInterviewsToSheet: async () => ({ ok: false, error: "never reached" }),
}));

import { POST } from "@/app/api/interviews/route";

beforeAll(() => {
  process.env.JWT_SECRET = "db-down-test-secret-0123456789";
});

beforeEach(() => {
  h.cookie = undefined;
});

describe("database outage handling", () => {
  it("returns 500 with a Persian message when the database is unreachable", async () => {
    h.cookie = await signSessionToken("admin");
    const res = await POST(
      new Request("http://localhost/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: {
            name: "فروشگاه تست",
            activityType: "original",
            yearsActive: "3-7",
            productCount: "10",
            carBrands: ["irankhodro"],
          },
          answers: {
            store_name: "فروشگاه تست",
            activity_type: "original",
            years_active: "3-7",
            product_count: "10",
            car_brands: ["irankhodro"],
            how_clients_find: ["phone"],
            call_before_visit_percent: "50",
            out_of_stock_often: "weekly",
            when_out_of_stock: ["order"],
            biggest_problem: "یافتن قطعه سخت است",
            find_part_time: "hour",
            wrong_part_mistakes: "rarely",
            has_online_sales: "yes",
            online_method: ["instagram"],
            online_experience: "good",
            site_benefit: ["customers"],
            usage_barriers: ["trust"],
            willing_register_products: "yes",
            register_time: "half_day",
            who_enters_products: "owner",
            delivery_preference: "in_person",
            reservation_useful: "yes",
            no_show_problem: "somewhat",
            prepay_ok: "depends",
            required_info_before_buy: ["price", "stock"],
            willing_pay_platform: "yes",
            revenue_model: ["commission"],
            suggested_commission: "10",
            commission_pay_time: "end_month",
            free_register_plus_commission_ok: "yes",
            trust_factors: ["support"],
            show_store_info_problem: "no",
            chat_needed: "yes",
            essential_features: ["live_stock"],
            one_problem_to_solve: "ثبت سریع",
            ideal_site_role: "ویترین",
            usage_avoid_reasons: ["no_customers"],
            seen_similar: "heard",
            will_register: "yes",
            will_register_reason: "مشتری آنلاین می‌خواهم",
          },
        }),
      }),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("پایگاه داده");
  });
});