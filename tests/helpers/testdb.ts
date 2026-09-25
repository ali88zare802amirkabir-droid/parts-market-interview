import path from "node:path";
import { PrismaClient } from "@/generated/prisma-test";

// The generated client resolves the relative `file:./test.db` based on its own
// runtime CWD, which differs from where `prisma db push` (schema-relative)
// creates the file. Pin one absolute file for both.
const testDbUrl = `file:${path.join(process.cwd(), "prisma", "test.db")}`;

/** Shared SQLite-backed test client. */
export const testDb = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

/** Wipe all rows (keeping the schema) for per-file test isolation. */
export async function resetTestDb(): Promise<void> {
  await testDb.interviewAnswer.deleteMany();
  await testDb.interviewNote.deleteMany();
  await testDb.store.deleteMany();
  await testDb.interview.deleteMany();
}

export function makeAnswerMap(overrides: Record<string, string | string[]> = {}) {
  return {
    store_name: "فروشگاه نمونه",
    activity_type: "original",
    years_active: "3-7",
    product_count: "150",
    car_brands: ["irankhodro"],
    how_clients_find: ["phone"],
    call_before_visit_percent: "50",
    out_of_stock_often: "weekly",
    when_out_of_stock: ["order"],
    biggest_problem: "یافتن قطعه نایاب سخت است",
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
    one_problem_to_solve: "ثبت سریع محصول",
    ideal_site_role: "ویترین فروش",
    usage_avoid_reasons: ["no_customers"],
    seen_similar: "heard",
    will_register: "yes",
    will_register_reason: "مشتری آنلاین می‌خواهم",
    ...overrides,
  };
}