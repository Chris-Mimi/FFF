import * as XLSX from 'xlsx';
import type { ParsedWeekSheet } from '@/types/wellpass';

const WEEK_SHEET_REGEX = /^Wk\s*(\d{1,2})$/i;

// xlsx stores Excel dates as UTC midnight in the local timezone. e.g. "2026-05-11"
// in Excel → Date(2026-05-10T22:00:00Z) when read by a Berlin-locale server.
// Use local-time accessors to recover the human-intended date string.
const toIsoDate = (cell: unknown): string | null => {
  let d: Date | null = null;
  if (cell instanceof Date) {
    d = cell;
  } else if (typeof cell === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    d = new Date(epoch.getTime() + cell * 24 * 60 * 60 * 1000);
  } else if (typeof cell === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cell)) {
    return cell.slice(0, 10);
  }
  if (!d) return null;
  // Use local methods — xlsx already applied locale shift on read.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseWeekSheet = (
  ws: XLSX.WorkSheet,
  sheetName: string
): ParsedWeekSheet | null => {
  const match = sheetName.match(WEEK_SHEET_REGEX);
  if (!match) return null;
  const weekNumber = parseInt(match[1], 10);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (rows.length < 3) return null;

  const headerRow = rows[0] as unknown[];
  const weekStart = toIsoDate(headerRow[4]);
  const weekEnd = toIsoDate(headerRow[5]);
  if (!weekStart || !weekEnd) return null;

  const data: ParsedWeekSheet['rows'] = [];
  const seen = new Set<string>();

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const name = row[0];
    const total = row[3];

    if (total === null || total === undefined || total === '') break;
    if (typeof name !== 'string') continue;

    const trimmed = name.trim();
    if (!trimmed) continue;

    const count = typeof total === 'number' ? Math.trunc(total) : parseInt(String(total), 10);
    if (!Number.isFinite(count) || count < 0) continue;

    if (seen.has(trimmed)) continue;
    seen.add(trimmed);

    data.push({ wellpass_name: trimmed, checkin_count: count });
  }

  return {
    week_number: weekNumber,
    week_start: weekStart,
    week_end: weekEnd,
    rows: data,
  };
};

export interface WorkbookParseResult {
  weeks: ParsedWeekSheet[];
  skipped_sheets: string[];
}

export const parseWellpassWorkbook = (buffer: Buffer): WorkbookParseResult => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const weeks: ParsedWeekSheet[] = [];
  const skipped: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!WEEK_SHEET_REGEX.test(sheetName)) {
      skipped.push(sheetName);
      continue;
    }
    const parsed = parseWeekSheet(workbook.Sheets[sheetName], sheetName);
    if (parsed && parsed.rows.length > 0) {
      weeks.push(parsed);
    } else if (!parsed) {
      skipped.push(sheetName);
    }
  }

  weeks.sort((a, b) => a.week_start.localeCompare(b.week_start));

  return { weeks, skipped_sheets: skipped };
};
