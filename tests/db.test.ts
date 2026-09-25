import { describe, it, expect, beforeEach, vi } from "vitest";
import { testDb, resetTestDb, makeAnswerMap } from "./helpers/testdb";
import { normalizeAnswers } from "@/lib/answers";
import {
  createInterview,
  updateInterview,
  deleteInterview,
  listInterviews,
} from "@/lib/repo";
import type { CreateInterviewInput } from "@/lib/repo";

vi.mock("@/lib/prisma", async () => {
  const { testDb } = await import("./helpers/testdb");
  return { prisma: testDb };
});

function baseInput(overrides: Partial<CreateInterviewInput["store"]> = {}): CreateInterviewInput {
  return {
    store: {
      name: "فروشگاه دماوند",
      activityType: "original",
      yearsActive: "3-7",
      productCount: 150,
      carBrands: ["irankhodro", "saipa"],
      ...overrides,
    },
    answers: normalizeAnswers(makeAnswerMap()),
    verdict: "POSITIVE",
    summary: "خلاصه تست",
  };
}

beforeEach(async () => {
  await resetTestDb();
});

describe("database layer (sqlite test db)", () => {
  it("creates an interview with store, answers and note", async () => {
    const id = await createInterview({ ...baseInput(), note: "یادداشت اول" });
    expect(id).toBeTruthy();

    const row = await testDb.interview.findUnique({
      where: { id },
      include: { store: true, answers: true, notes: true },
    });
    expect(row).not.toBeNull();
    expect(row!.store!.name).toBe("فروشگاه دماوند");
    expect(row!.answers.length).toBeGreaterThan(20);
    expect(row!.notes).toHaveLength(1);
    expect(row!.verdict).toBe("POSITIVE");
    expect(row!.sheetStatus).toBe("PENDING");
  });

  it("updates store + answers atomically", async () => {
    const id = await createInterview(baseInput());
    const updated = await updateInterview(
      id,
      {
        ...baseInput({
          name: "فروشگاه دماوند ۲",
          productCount: 900,
        }),
        answers: normalizeAnswers(makeAnswerMap({ suggested_commission: "12" })),
      },
      testDb,
    );
    expect(updated).toBe(id);

    const row = await testDb.interview.findUnique({
      where: { id },
      include: { store: true, answers: true },
    });
    expect(row!.store!.name).toBe("فروشگاه دماوند ۲");
    expect(row!.store!.productCount).toBe(900);
    const commission = row!.answers.find((a) => a.questionKey === "suggested_commission");
    expect(commission?.answer).toBe("12٪");
  });

  it("returns null when updating a missing interview", async () => {
    const id = "does-not-exist";
    const result = await updateInterview(id, baseInput(), testDb);
    expect(result).toBeNull();
  });

  it("deletes an interview with cascades", async () => {
    const id = await createInterview(baseInput());
    expect(await deleteInterview(id, testDb)).toBe(true);
    expect(await testDb.interview.findUnique({ where: { id } })).toBeNull();
    expect(await testDb.store.count()).toBe(0);
    expect(await testDb.interviewAnswer.count()).toBe(0);
    // deleting a missing interview returns false
    expect(await deleteInterview(id, testDb)).toBe(false);
  });

  it("searches by store name", async () => {
    await createInterview(baseInput({ name: "دماوند" }));
    await createInterview(baseInput({ name: "پارس یدک" }));

    const found = await listInterviews({ search: "دماوند" });
    expect(found).toHaveLength(1);
    expect(found[0].store!.name).toBe("دماوند");
  });

  it("filters by verdict", async () => {
    await createInterview({ ...baseInput(), verdict: "POSITIVE" });
    await createInterview({ ...baseInput({ name: "A" }), verdict: "NEGATIVE" });

    const filtered = await listInterviews({ verdict: "NEGATIVE" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].verdict).toBe("NEGATIVE");
  });

  it("sorts by store name", async () => {
    await createInterview(baseInput({ name: "ب" }));
    await createInterview(baseInput({ name: "الف" }));

    const asc = await listInterviews({ sort: "name", order: "asc" });
    expect(asc.map((i) => i.store!.name)).toEqual(["الف", "ب"]);
    const desc = await listInterviews({ sort: "name", order: "desc" });
    expect(desc.map((i) => i.store!.name)).toEqual(["ب", "الف"]);
  });

  it("adds notes and keeps them on the interview", async () => {
    const id = await createInterview(baseInput());
    await testDb.interviewNote.create({
      data: { interviewId: id, content: "یادداشت ضمیمه" },
    });
    const row = await testDb.interview.findUnique({
      where: { id },
      include: { notes: true },
    });
    expect(row!.notes.some((n) => n.content === "یادداشت ضمیمه")).toBe(true);
  });
});