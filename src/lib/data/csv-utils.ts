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

// RFC 4180準拠の全文ステートマシン。書き手（pandas to_csv / csv.writer）と方言を一致させる:
// クォート内の改行はフィールド内容のまま（行分割しない）、"" はエスケープ解除。
// 行分割を先に行う旧実装は、合法クォート内の改行1つでレコードが捏造される（検証レポート run-1）
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur.trim()); cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(cur.trim()); cur = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur.trim());
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
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
    // parseCsv経由（クォート対応）。素のsplit(",")はクォート内カンマで日付列がずれる
    const rows = readCsvFile("games.csv", season);
    if (rows.length < 2) return "不明";
    const dateIdx = rows[0].indexOf("GAME_DATE");
    return (dateIdx >= 0 ? rows[rows.length - 1][dateIdx]?.trim() : "") || "不明";
  } catch {
    return "不明";
  }
}
