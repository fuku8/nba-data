import { HomeDashboard } from "@/app/home-dashboard";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: phaseTitle("rs"),
  description: `${phaseTitle("rs")} の順位表（東西）とスタッツリーダー（得点・リバウンド・アシスト）。`,
  path: "/",
});


export default function HomePage() {
  return <HomeDashboard defaultTab="rs" />;
}
