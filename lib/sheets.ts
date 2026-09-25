import { JWT } from "google-auth-library";
import { buildSheetRows, type CsvInterviewRow } from "@/lib/csv";

/**
 * Google Sheets sync service.
 *
 * The PostgreSQL database is always the source of truth. This module only
 * pushes a read-only/export copy of interviews into a Google Spreadsheet.
 * Failures are caught and returned — the caller records sheetStatus = FAILED
 * on the Interview row so saving an interview never breaks because of Sheets.
 */

export function sheetsEnabled(): boolean {
  return (
    process.env.GOOGLE_SHEETS_ENABLED === "true" &&
    Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
        process.env.GOOGLE_SHEET_ID,
    )
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function cleanPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const client = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: cleanPrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? ""),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to obtain a Google Sheets access token.");
  cachedToken = { token: token.token, expiresAt: Date.now() + 55 * 60_000 };
  return token.token;
}

const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID is not configured.");
  return id;
}

function sheetRange(): string {
  return process.env.GOOGLE_SHEET_RANGE ?? "Sheet1";
}

async function sheetIsEmpty(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const url = `${SHEETS_BASE_URL}/${sheetId()}/values/${sheetRange()}!A1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return true; // e.g. 400 "unable to parse range" => empty sheet
    const data = (await res.json()) as { values?: unknown[][] };
    return !Array.isArray(data.values) || data.values.length === 0;
  } catch {
    return true;
  }
}

async function appendValues(values: (string | number)[][]): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId()}/values/${sheetRange()}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets append failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

export interface SheetSyncResult {
  ok: boolean;
  error?: string;
}

/**
 * Push a batch of interviews (or one) into the spreadsheet.
 * - If the target range is empty, the header row is written first.
 * - Never throws: returns { ok: false, error } instead.
 */
export async function syncInterviewsToSheet(
  interviews: CsvInterviewRow[],
): Promise<SheetSyncResult> {
  if (!sheetsEnabled()) return { ok: true, error: undefined };
  if (interviews.length === 0) return { ok: true, error: undefined };
  try {
    const empty = await sheetIsEmpty();
    const rows = buildSheetRows(interviews);
    if (empty) {
      await appendValues(rows);
    } else {
      await appendValues(rows.slice(1)); // headers already present
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Google Sheets error",
    };
  }
}

/** Convenience: push a single interview. */
export async function syncInterviewToSheet(
  interview: CsvInterviewRow,
): Promise<SheetSyncResult> {
  return syncInterviewsToSheet([interview]);
}