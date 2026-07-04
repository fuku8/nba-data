import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTypeLeaderboard } from "@/lib/data/player-types";
import { MetricLink } from "@/components/metric-link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "選手タイプ | NBA Data",
  description: "スタイルから判定した7つの選手タイプと、タイプ別のリーグ内評価点ランキング",
};

function Board({ players }: { players: { id: number; name: string; score: number }[] }) {
  if (players.length === 0) return <p className="text-sm text-muted-foreground">該当選手なし</p>;
  return (
    <ol className="space-y-1.5">
      {players.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2 text-sm">
          <span className="w-5 text-right font-mono text-muted-foreground">{i + 1}</span>
          <Link href={`/players/${p.id}`} className="hover:underline flex-1 truncate">
            {p.name}
          </Link>
          <span className="font-mono font-semibold">{(p.score * 100).toFixed(1)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function TypesPage() {
  const rs = getTypeLeaderboard("rs");
  const po = new Map(getTypeLeaderboard("po").map((t) => [t.type, t.players]));

  return (
    <div className="space-y-6">
      <div>
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
