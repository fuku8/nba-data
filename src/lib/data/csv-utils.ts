import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export function readCsvFile(filename: string): string[][] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, "utf-8");
  return parseCsv(content);
}

function parseCsv(content: string): string[][] {
  const lines = content.trim().split("\n");
  return lines.map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

export function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

export function num(val: string | undefined): number {
  if (!val || val === "" || val === "—") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function getPoDataTimestamp(): string {
  try {
    const filepath = path.join(DATA_DIR, "po_player_per_game.csv");
    if (!fs.existsSync(filepath)) return "";
    const mtime = fs.statSync(filepath).mtime;
    return mtime.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " ET";
  } catch {
    return "";
  }
}

export function getLatestGameDate(): string {
  try {
    const filepath = path.join(DATA_DIR, "games.csv");
    if (!fs.existsSync(filepath)) return "不明";
    const content = fs.readFileSync(filepath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length < 2) return "不明";
    // Header: GAME_ID,GAME_DATE,...  — GAME_DATE is column index 1
    const lastLine = lines[lines.length - 1];
    const parts = lastLine.split(",");
    return parts[1]?.trim() || "不明";
  } catch {
    return "不明";
  }
}
