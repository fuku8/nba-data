import { ImageResponse } from "next/og";
import { currentSeason, poYear } from "@/lib/season";
import type { Phase } from "@/lib/phase";
import { SITE_NAME } from "@/lib/metadata";

// OGP 画像（1200×630）の共通フレーム。文字は英数字だけにして next/og 同梱の Inter で描く
// （日本語を入れると画像ごとにフォント取得が要り、650枚のビルドが遅く不安定になる。2026-09-02 決定）
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
  const titleSize = title.length > 22 ? 64 : 88;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BG, color: INK, fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 28, height: "100%", background: accent }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 72px 56px 64px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: SOFT }}>
            <span>{SITE_NAME}</span>
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
    OG_SIZE,
  );
}
