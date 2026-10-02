import { ogImage, seasonLabel, PO_ORANGE } from "@/lib/og";
import { allSeasons } from "@/lib/season";

// 過去季に残すページ（/standings/2025-26 など。plan.md §13-10）の OG 画像。URL は /og/seasons/<季>/<ページ>。
// それらのページは catch-all ルートで、その下に opengraph-image.tsx は置けない（選手ページと同じ Next の制約）。
// 今季のページは各セグメントの opengraph-image.tsx を使う（文言はそちらと揃える）
const PAGES = {
  standings: { title: "Standings", subtitle: "W-L, Win%, GB, ORtg / DRtg / NRtg / Pace", phase: "rs" },
  leaders: { title: "League Leaders", subtitle: "Category leaders, USG% x TS% and STL x BLK maps", phase: "rs" },
  "leaders-po": { title: "League Leaders", subtitle: "Playoff category leaders and maps", phase: "po" },
  playoffs: { title: "Playoff Bracket", subtitle: "Series results and stat leaders", phase: "po" },
} as const;

export const dynamicParams = false;
export const dynamic = "force-static";

// ponytail: 使うのは過去季ぶんだけだが、今季ぶんも生成する（4枚）。過去季が無い間に空だと
// 静的エクスポートのビルドが落ちるため（ROLLOVER.md「既知の落とし穴」1）
export function generateStaticParams() {
  return allSeasons().flatMap((season) => Object.keys(PAGES).map((page) => ({ slug: [season, page] })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const [season, page] = (await params).slug;
  const { title, subtitle, phase } = PAGES[page as keyof typeof PAGES];
  return ogImage({ title, subtitle, kicker: seasonLabel(phase, season), accent: phase === "po" ? PO_ORANGE : "#3f3f46" });
}
