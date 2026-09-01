import fs from "fs";
import path from "path";
import { currentSeason, seasonDir } from "../season.ts";

// データ文脈: season 省略＝現シーズン（data/）、過去は data/<season>/。phase 省略＝RS、"po" は po_ 接頭辞ファイル
export type Phase = "rs" | "po";
export interface DataCtx { season?: string; phase?: Phase }
export const phaseFile = (name: string, phase?: Phase) => (phase === "po" ? `po_${name}` : name);

export function readCsvFile(filename: string, season?: string): string[][] {
  const filepath = path.join(seasonDir(season ?? currentSeason()), filename);
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

// POの最終試合日（po_games.csv の末尾行）。ファイルの mtime は Cloudflare Pages のビルドでは checkout 時刻になるため使わない
export function getPoLastGameDate(season?: string): string {
  const rows = readCsvFile("po_games.csv", season);
  if (rows.length < 2) return "";
  const dateIdx = rows[0].indexOf("GAME_DATE");
  return dateIdx >= 0 ? rows[rows.length - 1][dateIdx] ?? "" : "";
}

// データCSVのmtimeスタンプ。モジュールレベルキャッシュの無効化判定に使う（ローカルでCSV差し替え時の再起動不要化）
export function dataStamp(fnames: string[], season?: string): string {
  const dir = seasonDir(season ?? currentSeason());
  return fnames.map((f) => {
    try {
      return fs.statSync(path.join(dir, f)).mtimeMs;
    } catch {
      return 0;
    }
  }).join("|");
}

export function getLatestGameDate(season?: string): string {
  try {
    const filepath = path.join(seasonDir(season ?? currentSeason()), "games.csv");
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
