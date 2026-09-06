import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import { getTypeLeaderboard } from "@/lib/data/player-types";
import { playerNameJa } from "@/lib/data/names-ja";
import { SegmentedName } from "@/components/segmented-name";
import { MetricLink } from "@/components/metric-link";
import { SeasonTitle } from "@/components/season-title";
import { currentSeason } from "@/lib/season";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "選手タイプ",
  description: "スタイルから判定した7つの選手タイプと、タイプ別のリーグ内評価点ランキング",
  path: "/types",
});

function Board({ players }: { players: { id: number; name: string; team: string; score: number }[] }) {
  if (players.length === 0) return <p className="text-sm text-muted-foreground">該当選手なし</p>;
  return (
    <ol className="space-y-1.5">
      {players.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2 text-sm">
          <span className="w-5 text-right font-mono text-muted-foreground shrink-0">{i + 1}</span>
          {/* フル名は切り詰めず折り返す（他の表・リストと同方針）。チームバッジはリーダーズと同じく名前直後のインライン */}
          <div className="flex-1 min-w-0 leading-snug">
            <Link href={`/players/${p.id}`} className="hover:underline">
              <SegmentedName name={p.name} />
            </Link>{" "}
            <Badge variant="outline" className="text-xs" style={{ borderColor: getTeamColor(p.team) }}>
              {p.team}
            </Badge>
          </div>
          <span className="font-mono font-semibold shrink-0">{(p.score * 100).toFixed(1)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function TypesPage() {
  // 表示はフル日本語名（対応表に無い選手は英語名のまま）
  const ja = (players: { id: number; name: string; team: string; score: number }[]) =>
    players.map((p) => ({ ...p, name: playerNameJa(p.id) ?? p.name }));
  const rs = getTypeLeaderboard("rs").map((t) => ({ ...t, players: ja(t.players) }));
  const po = new Map(getTypeLeaderboard("po").map((t) => [t.type, ja(t.players)]));

  return (
    <div className="space-y-6">
      <div>
        <SeasonTitle season={currentSeason()} />
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">選手タイプ</h1>
          <MetricLink anchor="player-type" />
        </div>
        <p className="text-muted-foreground mt-2">
          プレースタイル（何をする選手か）から判定した7タイプと、そのタイプの職務としての評価点（100が最上位）。
          スタイル適合が明確な選手は複数タイプに登場します。リーダーボードはスタイル特徴が+1σ以上で明確に適合する選手のみが対象で、
          選手ページで「(参考)」と表示される消去法バッジの選手は含まれません。
        </p>
      </div>

      {rs.map(({ type, players }) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle>{type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Regular Season</div>
                <Board players={players} />
              </div>
              <div>
                <div className="text-xs font-medium text-orange-400 mb-2">Playoffs</div>
                <Board players={po.get(type) ?? []} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
