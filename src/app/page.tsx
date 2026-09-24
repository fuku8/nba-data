import { HomeDashboard } from "@/app/home-dashboard";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: phaseTitle("rs"),
  description: `${phaseTitle("rs")} の順位表（東西）とスタッツリーダー（得点・リバウンド・アシスト）。`,
  path: "/",
});


export default function HomePage() {
  return (
    <>
      {/* サイトの自己紹介（sumo-data の top-lead と同趣旨・§13-5 タグラインの掲出）。いきなり図では何のサイトか分からない、というふくたろう指摘（2026-09-24） */}
      <p className="mb-4 text-sm text-muted-foreground">
        NBAの数字を、かたちで感じる。公式スタッツを独自の図表にして、シーズン中は日々更新しています。
      </p>
      <HomeDashboard defaultTab="rs" />
    </>
  );
}
