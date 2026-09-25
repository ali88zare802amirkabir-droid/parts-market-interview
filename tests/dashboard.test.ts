import { describe, it, expect } from "vitest";
import {
  computeDashboard,
  willingnessBucket,
  median,
  categorizeProblem,
  type InterviewRow,
} from "@/lib/dashboard";

function fixture(over: Partial<InterviewRow> = {}): InterviewRow {
  return {
    id: Math.random().toString(36).slice(2),
    code: 1,
    status: "COMPLETED",
    verdict: "POSITIVE",
    createdAt: new Date("2026-01-01"),
    completedAt: new Date("2026-01-01"),
    store: { name: "فروشگاه" },
    answers: [
      { questionKey: "will_register", answer: "بله", answerData: '"yes"' },
      { questionKey: "suggested_commission", answer: "10٪", answerData: "10" },
      { questionKey: "revenue_model", answer: "درصد از فروش، اشتراک", answerData: '["commission","subscription"]' },
      { questionKey: "prepay_ok", answer: "بله", answerData: '"yes"' },
      { questionKey: "delivery_preference", answer: "دریافت حضوری", answerData: '"in_person"' },
      { questionKey: "biggest_problem", answer: "یافتن قطعه نایاب مشکل است", answerData: null },
    ],
    ...over,
  };
}

describe("dashboard calculations", () => {
  it("maps willingness buckets", () => {
    expect(willingnessBucket("yes")).toBe("yes");
    expect(willingnessBucket("maybe")).toBe("maybe");
    expect(willingnessBucket("unsure")).toBe("maybe");
    expect(willingnessBucket("no")).toBe("no");
    expect(willingnessBucket(undefined)).toBeNull();
    expect(willingnessBucket("junk")).toBeNull();
  });

  it("computes median", () => {
    expect(median([])).toBeNull();
    expect(median([10])).toBe(10);
    expect(median([3, 8, 4])).toBe(4);
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("computes totals, average and median commission", () => {
    const rows: InterviewRow[] = [
      fixture({
        id: "a",
        answers: [
          { questionKey: "will_register", answer: "بله", answerData: '"yes"' },
          { questionKey: "suggested_commission", answer: "10٪", answerData: "10" },
        ],
      }),
      fixture({
        id: "b",
        answers: [
          { questionKey: "will_register", answer: "احتمالاً", answerData: '"maybe"' },
          { questionKey: "suggested_commission", answer: "6٪", answerData: "6" },
        ],
      }),
      fixture({
        id: "c",
        answers: [
          { questionKey: "will_register", answer: "خیر", answerData: '"no"' },
        ],
      }),
    ];
    const stats = computeDashboard(rows);
    expect(stats.totalInterviews).toBe(3);
    expect(stats.willingness).toEqual({ yes: 1, maybe: 1, no: 1, unanswered: 0 });
    expect(stats.willingnessRate).toBe(67);
    expect(stats.averageCommission).toBe(8);
    expect(stats.medianCommission).toBe(8);
    expect(stats.totalStores).toBe(3);
  });

  it("ignores missing commissions and counts distribution", () => {
    const rows: InterviewRow[] = [
      fixture({ id: "a", answers: [{ questionKey: "suggested_commission", answer: "5٪", answerData: "5" }] }),
      fixture({ id: "b", answers: [{ questionKey: "suggested_commission", answer: "20٪", answerData: "20" }] }),
      fixture({ id: "c", answers: [{ questionKey: "suggested_commission", answer: "0٪", answerData: "0" }] }),
      fixture({ id: "d", answers: [] }),
    ];
    const stats = computeDashboard(rows);
    expect(stats.averageCommission).toBe(8.3);
    expect(stats.medianCommission).toBe(5);
    const buckets = Object.fromEntries(stats.commissionDistribution.map((b) => [b.bucket, b.count]));
    expect(buckets["۰٪"]).toBe(1);
    expect(buckets["۱ تا ۵٪"]).toBe(1);
    expect(buckets["۱۱ تا ۲۰٪"]).toBe(1);
  });

  it("builds business/payment/delivery distributions", () => {
    const rows: InterviewRow[] = [
      fixture({
        answers: [
          { questionKey: "revenue_model", answer: "درصد از فروش", answerData: '["commission"]' },
          { questionKey: "prepay_ok", answer: "بله", answerData: '"yes"' },
          { questionKey: "delivery_preference", answer: "پیک", answerData: '"courier"' },
        ],
      }),
      fixture({
        answers: [
          { questionKey: "revenue_model", answer: "درصد از فروش، مبلغ ثابت", answerData: '["commission","fixed"]' },
          { questionKey: "prepay_ok", answer: "بستگی به مبلغ", answerData: '"depends"' },
          { questionKey: "delivery_preference", answer: "پست", answerData: '"post"' },
        ],
      }),
    ];
    const stats = computeDashboard(rows);
    expect(stats.businessModel["درصد از فروش"]).toBe(2);
    expect(stats.businessModel["مبلغ ثابت"]).toBe(1);
    expect(stats.paymentModel["بله"]).toBe(1);
    expect(stats.paymentModel["بسته به مبلغ"]).toBe(1);
    expect(stats.deliveryMethod["پیک"]).toBe(1);
  });

  it("categorizes free-text problems", () => {
    expect(categorizeProblem("پیدا کردن قطعه نایاب سخت است")).toBe("یافتن قطعه نایاب / تأمین");
    expect(categorizeProblem("مشتری در این منطقه کم است")).toBe("مشتری‌یابی و مشتری");
    expect(categorizeProblem("رقابت قیمتی شدید و سود کم")).toBe("قیمت و رقابت");
    expect(categorizeProblem("اصلاً چیز خاصی")).toBe("سایر");

    const stats = computeDashboard([
      fixture({
        answers: [
          { questionKey: "biggest_problem", answer: "قطعه نایاب", answerData: null },
        ],
      }),
      fixture({
        answers: [
          { questionKey: "biggest_problem", answer: "مشتری کم", answerData: null },
        ],
      }),
    ]);
    expect(stats.problems["یافتن قطعه نایاب / تأمین"]).toBe(1);
    expect(stats.problems["مشتری‌یابی و مشتری"]).toBe(1);
  });

  it("returns recent interviews sorted by date", () => {
    const rows: InterviewRow[] = [
      fixture({ id: "old", code: 1, completedAt: new Date("2026-01-01") }),
      fixture({ id: "new", code: 2, completedAt: new Date("2026-02-01") }),
    ];
    const stats = computeDashboard(rows);
    expect(stats.recentInterviews[0].id).toBe("new");
    expect(stats.recentInterviews[1].id).toBe("old");
  });
});