import { PHASE_LABEL, type Phase } from "@/lib/phase";

// ページ見出しの上に置く期間表示。年次が回ってもページ単体で「いつのデータか」が分かるようにする。
// RS/PO が固定のページは phase を渡し、両方を載せるページ（チーム詳細・選手・選手タイプ）はシーズンだけ出す
export function SeasonTitle({ season, phase }: { season: string; phase?: Phase }) {
  return (
    <p className="text-sm font-semibold text-muted-foreground">
      NBA {season}
      {phase && ` ${PHASE_LABEL[phase]}`}
    </p>
  );
}
