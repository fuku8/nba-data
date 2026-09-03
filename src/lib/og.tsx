import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { currentSeason, poYear } from "@/lib/season";
import type { Phase } from "@/lib/phase";
import { SITE_NAME_EN } from "@/lib/metadata";

// OGP 画像（1200×630）の共通フレーム。
// 日本語はローカル同梱のサブセットフォントで描く（plan §13-1 段階2）。対応表の全文字＋ASCII＋
// 英語名のダイアクリティカルの 203 字・各55KB を一度だけ読むので、「画像ごとにフォント取得が要り
// 650枚のビルドが不安定」という 2026-09-02 の英数字のみ決定の前提は生じない。生成は
// scripts/subset-og-font.py（対応表を更新したら再実行）
const FONT_DIR = path.join(process.cwd(), "src/assets/og");
const OG_FONTS = [
  { name: "Noto Sans JP", data: fs.readFileSync(path.join(FONT_DIR, "NotoSansJP-400-subset.ttf")), weight: 400 as const, style: "normal" as const },
  { name: "Noto Sans JP", data: fs.readFileSync(path.join(FONT_DIR, "NotoSansJP-700-subset.ttf")), weight: 700 as const, style: "normal" as const },
];
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#0b0b0c";
const INK = "#fafafa";
const SOFT = "#a1a1aa";
export const PO_ORANGE = "#f97316";

export const seasonLabel = (phase: Phase, season = currentSeason()) =>
  phase === "po" ? `NBA ${poYear(season)} Playoffs` : `NBA ${season} Regular Season`;

export type Stat = { label: string; value: string };

// title（大）・subtitle（中）・stats（下段の数値）・accent（左帯の色）
export function ogImage({ title, subtitle, stats = [], accent = "#3f3f46", kicker }: {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  accent?: string;
  kicker?: string;
}) {
  // 全角（日本語）は半角の約2倍幅なので、幅換算でサイズを段階的に落とす
  const units = [...title].reduce((a, c) => a + ((c.codePointAt(0) ?? 0) > 0xff ? 2 : 1), 0);
  const titleSize = units > 30 ? 52 : units > 22 ? 64 : 88;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BG, color: INK, fontFamily: "'Noto Sans JP', Inter, sans-serif" }}>
        <div style={{ width: 28, height: "100%", background: accent }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 72px 56px 64px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: SOFT }}>
            <span>{SITE_NAME_EN}</span>
            {kicker && <span>{kicker}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 38, color: SOFT, marginTop: 18 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 56, minHeight: 90 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 26, color: SOFT }}>{s.label}</span>
                <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
