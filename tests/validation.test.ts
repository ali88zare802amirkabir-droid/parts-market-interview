import { describe, it, expect } from "vitest";
import {
  validateStep,
  validateAll,
  validateAnswerValue,
} from "@/lib/validate";
import { isQuestionVisible, getQuestion } from "@/lib/questions";
import { makeAnswerMap } from "./helpers/testdb";
import { normalizeAnswers, isComplete } from "@/lib/answers";

describe("validation", () => {
  it("rejects an empty step 1 (name required)", () => {
    const answers = makeAnswerMap({ store_name: "" });
    const { ok, errors } = validateStep(1, answers);
    expect(ok).toBe(false);
    expect(errors.store_name).toBeDefined();
  });

  it("accepts a valid step 1", () => {
    const { ok, errors } = validateStep(1, makeAnswerMap());
    expect(ok).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("bounds commission to 0..100", () => {
    const q = getQuestion("suggested_commission")!;
    expect(validateAnswerValue(q, "150")).toContain("بیشتر");
    expect(validateAnswerValue(q, "120")).toContain("بیشتر");
    expect(validateAnswerValue(q, "7")).toBeNull();
    expect(validateAnswerValue(q, "-3")).toContain("کمتر");
  });

  it("rejects non-numeric percentage text", () => {
    const q = getQuestion("call_before_visit_percent")!;
    expect(validateAnswerValue(q, "abc")).toContain("عدد معتبر");
    expect(validateAnswerValue(q, "45")).toBeNull();
  });

  it("requires at least one option in multiselect", () => {
    const q = getQuestion("car_brands")!;
    expect(validateAnswerValue(q, [])).toBe("این پاسخ الزامی است.");
    expect(validateAnswerValue(q, ["saipa"])).toBeNull();
  });

  it("shows conditional questions based on earlier answers", () => {
    const neverOnline = getQuestion("online_never_reason")!;
    // never → ask why no online sales
    expect(isQuestionVisible(neverOnline, { has_online_sales: "never" })).toBe(true);
    expect(isQuestionVisible(neverOnline, { has_online_sales: "yes" })).toBe(false);

    const method = getQuestion("online_method")!;
    expect(isQuestionVisible(method, { has_online_sales: "had" })).toBe(true);
    expect(isQuestionVisible(method, { has_online_sales: "never" })).toBe(false);

    const stopped = getQuestion("online_stopped_reason")!;
    expect(isQuestionVisible(stopped, { has_online_sales: "had" })).toBe(true);
    expect(isQuestionVisible(stopped, { has_online_sales: "yes" })).toBe(false);

    const notWilling = getQuestion("not_willing_reason")!;
    expect(isQuestionVisible(notWilling, { willing_pay_platform: "no" })).toBe(true);
    expect(isQuestionVisible(notWilling, { willing_pay_platform: "yes" })).toBe(false);

    const reservation = getQuestion("reservation_not_good_reason")!;
    expect(isQuestionVisible(reservation, { reservation_useful: "no" })).toBe(true);
    expect(isQuestionVisible(reservation, { reservation_useful: "yes" })).toBe(false);
  });

  it("validates a complete submission and flags missing required answers", () => {
    const errors = validateAll(makeAnswerMap());
    expect(Object.keys(errors)).toHaveLength(0);

    const incomplete = makeAnswerMap({ will_register: "" });
    const errs = validateAll(incomplete);
    expect(errs.will_register).toBeDefined();
  });

  it("does not require hidden conditional answers", () => {
    const never = makeAnswerMap({
      has_online_sales: "never",
      online_never_reason: "چون نمی‌خواهم",
      willing_pay_platform: "no",
      not_willing_reason: "گران است",
    });
    // Remove answers that should be hidden when has_online_sales = never
    delete (never as Record<string, unknown>).online_method;
    delete (never as Record<string, unknown>).online_experience;
    const errors = validateAll(never);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("normalizes answers into structured rows and checks completeness", () => {
    const rows = normalizeAnswers(makeAnswerMap());
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.find((r) => r.questionKey === "suggested_commission")).toMatchObject({
      answer: "10٪",
    });
    const commissionRow = rows.find((r) => r.questionKey === "suggested_commission")!;
    expect(JSON.parse(commissionRow.answerData!)).toBe(10);

    expect(isComplete(makeAnswerMap())).toBe(true);
    expect(isComplete(makeAnswerMap({ will_register: "" }))).toBe(false);
  });
});