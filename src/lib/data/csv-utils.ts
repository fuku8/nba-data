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

export function getLastUpdated(): string {
  try {
    const filepath = path.join(DATA_DIR, "last_updated.txt");
    return fs.readFileSync(filepath, "utf-8").trim();
  } catch {
    return "不明";
  }
}
