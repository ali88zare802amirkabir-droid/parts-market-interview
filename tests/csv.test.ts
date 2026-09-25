import { describe, it, expect } from "vitest";
import { exportInterviewsToCsv, buildSheetRows } from "@/lib/csv";
import type { CsvInterviewRow } from "@/lib/csv";

function rowFixture(): CsvInterviewRow {
  return {
    id: "abc",
    code: 5,
    status: "COMPLETED",
    verdict: "POSITIVE",
    createdAt: new Date("2026-05-04T10:30:00"),
    completedAt: new Date("2026-05-04T10:30:00"),
    summary: "خلاصه، با ویرگول",
    store: { name: "فروشگاه, با ویرگول" },
    answers: [
      { questionKey: "store_name", answer: "فروشگاه, با ویرگول" },
      { questionKey: "suggested_commission", answer: "10٪" },
      { questionKey: "will_register", answer: "بله" },
      { questionKey: "biggest_problem", answer: "قطعه" },
    ],
  };
}

describe("CSV export", () => {
  it("starts with a UTF-8 BOM for Excel compatibility", () => {
    const csv = exportInterviewsToCsv([rowFixture()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes the header row and one data row", () => {
    const csv = exportInterviewsToCsv([rowFixture()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("نام فروشگاه");
    expect(lines[0]).toContain("کمیسیون پیشنهادی");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[1]).toContain("5"); // code column
    expect(lines[1]).toContain("10٪");
  });

  it("quotes fields that contain commas or quotes", () => {
    const csv = exportInterviewsToCsv([rowFixture()]);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toContain('"فروشگاه, با ویرگول"');
  });

  it("escapes embedded double quotes", () => {
    const row = rowFixture();
    row.summary = 'گفت: "ترجیح میدهم"';
    const csv = exportInterviewsToCsv([row]);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toContain('"گفت: ""ترجیح میدهم"""');
  });

  it("maps empty interviews to empty cells, not errors", () => {
    const csv = exportInterviewsToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const headerCount = csv.split("\r\n")[0].split(",").length;
    expect(headerCount).toBeGreaterThan(30);
  });
});

describe("Google Sheets rows", () => {
  it("builds header + data rows sharing the CSV layout", () => {
    const rows = buildSheetRows([rowFixture()]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("نام فروشگاه");
    expect(rows[1][2]).toBe("فروشگاه, با ویرگول"); // store name column
    expect(rows[1][0]).toBe(5);
  });
});