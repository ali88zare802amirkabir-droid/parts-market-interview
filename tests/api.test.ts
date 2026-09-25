import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { testDb, resetTestDb } from "./helpers/testdb";
import { signSessionToken } from "@/lib/auth";

const h = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      h.cookie ? { name: "parts_admin_session", value: h.cookie } : undefined,
  }),
}));

vi.mock("@/lib/prisma", async () => {
  const { testDb } = await import("./helpers/testdb");
  return { prisma: testDb };
});

const sheets = vi.hoisted(() => ({
  enabled: true,
  fail: false,
}));

vi.mock("@/lib/sheets", () => ({
  sheetsEnabled: () => sheets.enabled,
  syncInterviewToSheet: async () =>
    sheets.fail
      ? { ok: false, error: "boom: sheets offline" }
      : { ok: true },
  syncInterviewsToSheet: async () =>
    sheets.fail
      ? { ok: false, error: "boom: sheets offline" }
      : { ok: true },
}));

import { POST as createInterview, GET as listInterviews } from "@/app/api/interviews/route";
import {
  GET as getInterview,
  PATCH as patchInterview,
  DELETE as deleteInterview,
} from "@/app/api/interviews/[id]/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { GET as getCsv } from "@/app/api/export/csv/route";
import { POST as syncAll } from "@/app/api/sync/route";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-api-tests-0123456789";
});

beforeEach(async () => {
  await resetTestDb();
  h.cookie = undefined;
  sheets.enabled = true;
  sheets.fail = false;
});

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    store: {
      name: "فروشگاه تهران",
      activityType: "original",
      yearsActive: "3-7",
      productCount: "150",
      carBrands: ["irankhodro"],
    },
    answers: {
      store_name: "فروشگاه تهران",
      activity_type: "original",
      years_active: "3-7",
      product_count: "150",
      car_brands: ["irankhodro"],
      how_clients_find: ["phone"],
      call_before_visit_percent: "50",
      out_of_stock_often: "weekly",
      when_out_of_stock: ["order"],
      biggest_problem: "قطعه نایاب",
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
    verdict: "POSITIVE",
    summary: "خلاصه API تست",
    ...overrides,
  };
}

function post(body: unknown) {
  return createInterview(new Request("http://localhost/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("interviews API", () => {
  it("rejects unauthenticated requests with 401", async () => {
    h.cookie = undefined;
    const res = await post(validBody());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(await testDb.interview.count()).toBe(0);
  });

  it("rejects requests with an invalid token", async () => {
    h.cookie = "not-a-valid-jwt";
    const res = await post(validBody());
    expect(res.status).toBe(401);
    expect(await testDb.interview.count()).toBe(0);
  });

  it("creates an interview with a valid session", async () => {
    h.cookie = await signSessionToken("admin");
    const res = await post(validBody());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.id).toBeTruthy();

    const row = await testDb.interview.findUnique({
      where: { id: json.data.id },
      include: { store: true, answers: true },
    });
    expect(row!.store!.name).toBe("فروشگاه تهران");
    expect(row!.answers.length).toBeGreaterThan(20);
    expect(row!.verdict).toBe("POSITIVE");
  });

  it("returns validation errors (422) for a missing required answer", async () => {
    h.cookie = await signSessionToken("admin");
    const body = validBody();
    body.answers = { ...(body.answers as Record<string, unknown>), store_name: "" };
    const res = await post(body);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.errors?.store_name).toBeTruthy();
    expect(await testDb.interview.count()).toBe(0);
  });

  it("rejects out-of-range commission (422)", async () => {
    h.cookie = await signSessionToken("admin");
    const body = validBody();
    body.answers = { ...(body.answers as Record<string, unknown>), suggested_commission: "250" };
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(await testDb.interview.count()).toBe(0);
  });

  it("lists interviews and applies search + filter + sort", async () => {
    h.cookie = await signSessionToken("admin");
    await post(validBody({ store: { name: "دماوند", activityType: "original", yearsActive: "3-7", productCount: "10", carBrands: ["saipa"] }, answers: { ...(validBody().answers as object) } }));
    await post(validBody());

    const res = await listInterviews(
      new NextRequest("http://localhost/api/interviews?search=دماوند"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.interviews).toHaveLength(1);
    expect(json.data.interviews[0].store.name).toBe("دماوند");

    const verdictRes = await listInterviews(
      new NextRequest("http://localhost/api/interviews?verdict=POSITIVE"),
    );
    expect((await verdictRes.json()).data.interviews.length).toBe(2);
  });

  it("fetches a single interview with notes", async () => {
    h.cookie = await signSessionToken("admin");
    const created = await post(validBody());
    const { data } = await created.json();
    await testDb.interviewNote.create({
      data: { interviewId: data.id, content: "یادداشت" },
    });

    const res = await getInterview(new NextRequest("http://localhost/api/interviews/x"), {
      params: Promise.resolve({ id: data.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.interview.store.name).toBe("فروشگاه تهران");
    expect(json.data.interview.notes).toHaveLength(1);
  });

  it("returns 404 for an unknown interview", async () => {
    h.cookie = await signSessionToken("admin");
    const res = await getInterview(new NextRequest("http://localhost/api/interviews/x"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates an interview via PATCH", async () => {
    h.cookie = await signSessionToken("admin");
    const created = await post(validBody());
    const { data } = await created.json();

    const res = await patchInterview(
      new Request("http://localhost/api/interviews/x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          validBody({
            store: { name: "نام جدید", activityType: "original", yearsActive: "3-7", productCount: "500", carBrands: ["irankhodro"] },
          }),
        ),
      }),
      { params: Promise.resolve({ id: data.id }) },
    );
    expect(res.status).toBe(200);
    const row = await testDb.interview.findUnique({ where: { id: data.id }, include: { store: true } });
    expect(row!.store!.name).toBe("نام جدید");
  });

  it("deletes an interview via DELETE", async () => {
    h.cookie = await signSessionToken("admin");
    const created = await post(validBody());
    const { data } = await created.json();

    const res = await deleteInterview(new NextRequest("http://localhost/api/interviews/x"), {
      params: Promise.resolve({ id: data.id }),
    });
    expect(res.status).toBe(200);
    expect(await testDb.interview.count()).toBe(0);
  });
});

describe("dashboard & export APIs", () => {
  it("computes dashboard stats", async () => {
    h.cookie = await signSessionToken("admin");
    await post(validBody());
    const res = await getDashboard(new NextRequest("http://localhost/api/dashboard"));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.stats.totalInterviews).toBe(1);
    expect(data.stats.totalStores).toBe(1);
    expect(data.stats.willingnessRate).toBe(100);
    expect(data.stats.averageCommission).toBe(10);
  });

  it("exports CSV with BOM and Persian content", async () => {
    h.cookie = await signSessionToken("admin");
    await post(validBody());
    const res = await getCsv(new NextRequest("http://localhost/api/export/csv"));
    expect(res.status).toBe(200);
    const buf = new Uint8Array(await res.arrayBuffer());
    // UTF-8 BOM must be the first three bytes on the wire (Excel compatibility).
    expect(buf.length).toBeGreaterThan(3);
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8").decode(buf);
    expect(text).toContain("فروشگاه تهران");
    expect(res.headers.get("content-type")).toContain("text/csv");
  });
});

describe("Google Sheets failure handling", () => {
  it("returns sheetsWarning and marks the row FAILED when sync fails", async () => {
    h.cookie = await signSessionToken("admin");
    sheets.fail = true;
    const res = await post(validBody());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.sheetsWarning).toBe(true);

    const row = await testDb.interview.findUnique({ where: { id: json.data.id } });
    expect(row!.sheetStatus).toBe("FAILED");
    expect(row!.sheetError).toBe("boom: sheets offline");
  });

  it("does not warn when sheets sync succeeds", async () => {
    h.cookie = await signSessionToken("admin");
    sheets.fail = false;
    const res = await post(validBody());
    const json = await res.json();
    expect(json.data.sheetsWarning).toBe(false);
    const row = await testDb.interview.findUnique({ where: { id: json.data.id } });
    expect(row!.sheetStatus).toBe("SYNCED");
  });

  it("sync route marks pending interviews as synced", async () => {
    h.cookie = await signSessionToken("admin");
    sheets.fail = false;
    const created = await post(validBody());
    const { data } = await created.json();
    await testDb.interview.update({
      where: { id: data.id },
      data: { sheetStatus: "PENDING" },
    });

    const res = await syncAll(new NextRequest("http://localhost/api/sync?mode=missing"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.synced).toBe(1);
    const row = await testDb.interview.findUnique({ where: { id: data.id } });
    expect(row!.sheetStatus).toBe("SYNCED");
  });

  it("sync route returns 502 when the sheet call fails", async () => {
    h.cookie = await signSessionToken("admin");
    sheets.fail = true;
    await post(validBody());
    const res = await syncAll(new NextRequest("http://localhost/api/sync?mode=missing"));
    expect(res.status).toBe(502);
  });
});