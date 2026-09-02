import { renderLeaders } from "./leaders-page";
import { pageMeta, phaseTitle } from "@/lib/metadata";

export const metadata = pageMeta({
  title: `リーダーズ · ${phaseTitle("rs")}`,
  description: `${phaseTitle("rs")}。得点・リバウンド・アシストなど部門別リーダーと、USG%×TS%・STL×BLK の四象限マップ。`,
  path: "/leaders",
});


export default function Page() {
  return renderLeaders("rs");
}
