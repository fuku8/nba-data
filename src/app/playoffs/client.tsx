"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamColor, getTeamAbbr } from "@/lib/constants/teams";
import type { PlayoffSeries, PlayoffPlayerPerGame } from "@/lib/types";
import type { Bracket } from "@/lib/bracket";

const ROUND_NAME: Record<number, string> = { 1: "1回戦", 2: "2回戦", 3: "カンファレンス決勝", 4: "ファイナル" };

// ── 木の1枠（PC幅）: 2行のコンパクト表示 ──────────────────────────
function BracketSlot({ s }: { s: PlayoffSeries | null }) {
  if (!s) {
    return (
      <div className="h-full rounded-md border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground min-h-14">
        —
      </div>
    );
  }
  const inProgress = !s.winner;
  const rows = [
    { name: s.team1, wins: s.team1Wins },
    { name: s.team2, wins: s.team2Wins },
  ];
  return (
    <div className={`h-full rounded-md border bg-card px-2 py-1.5 text-sm min-h-14 flex flex-col justify-center gap-0.5 ${inProgress ? "border-orange-500/60" : ""}`}>
      {rows.map((t) => {
        const abbr = getTeamAbbr(t.name);
        const won = !inProgress && s.winner === t.name;
        const lost = !inProgress && !won;
        return (
          <div key={t.name} className={`flex items-center justify-between gap-2 ${lost ? "opacity-50" : ""}`}>
            <Link href={`/teams/${abbr}`} className={`truncate hover:underline ${won ? "font-bold" : ""}`} style={{ color: getTeamColor(t.name) }}>
              {abbr}
            </Link>
            <span className={`font-mono ${won ? "font-bold" : ""}`}>{t.wins}</span>
          </div>
        );
      })}
    </div>
  );
}

// PC幅: 左=West・中央=ファイナル・右=East のトーナメント木（純CSS grid、8行）
// 1回戦は各枠2行、2回戦は4行、CFとファイナルは8行を占めて中央に寄る
function BracketTree({ bracket }: { bracket: Bracket }) {
  const col = (round: (PlayoffSeries | null)[], rowSpan: number, colStart: number) =>
    round.map((s, i) => (
      <div key={`${colStart}-${i}`} className="flex items-center" style={{ gridColumn: colStart, gridRow: `${i * rowSpan + 1} / span ${rowSpan}` }}>
        <div className="w-full">
          <BracketSlot s={s} />
        </div>
      </div>
    ));
  const headers = ["1回戦", "2回戦", "カンファレンス決勝", "ファイナル", "カンファレンス決勝", "2回戦", "1回戦"];
  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-7 gap-x-3 text-center text-xs text-muted-foreground mb-2">
        <div className="col-span-3 text-left font-semibold text-foreground">West</div>
        <div />
        <div className="col-span-3 text-right font-semibold text-foreground">East</div>
        {headers.map((h, i) => (
          <div key={i}>{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-8 gap-x-3 gap-y-1">
        {col(bracket.west[0], 2, 1)}
        {col(bracket.west[1], 4, 2)}
        {col(bracket.west[2], 8, 3)}
        {col([bracket.finals], 8, 4)}
        {col(bracket.east[2], 8, 5)}
        {col(bracket.east[1], 4, 6)}
        {col(bracket.east[0], 2, 7)}
      </div>
    </div>
  );
}

// ── 縦リスト（モバイル幅）。最新ラウンドが先 ──────────────────────
function SeriesCard({ s }: { s: PlayoffSeries }) {
  const inProgress = !s.winner;
  const t1Color = getTeamColor(s.team1);
  const t2Color = getTeamColor(s.team2);

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <Link href={`/teams/${getTeamAbbr(s.team1)}`} className="text-sm font-semibold truncate w-full text-center hover:underline" style={{ color: t1Color }}>{s.team1}</Link>
            <span className="text-3xl font-bold mt-1">{s.team1Wins}</span>
          </div>
          <div className="flex flex-col items-center px-2">
            {inProgress ? (
              <Badge variant="secondary" className="text-xs">進行中</Badge>
            ) : (
              <Badge className="text-xs bg-orange-500 text-white border-0">終了</Badge>
            )}
            <span className="text-xs text-muted-foreground mt-1">{s.seriesStatus}</span>
          </div>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <Link href={`/teams/${getTeamAbbr(s.team2)}`} className="text-sm font-semibold truncate w-full text-center hover:underline" style={{ color: t2Color }}>{s.team2}</Link>
            <span className="text-3xl font-bold mt-1">{s.team2Wins}</span>
          </div>
        </div>
        {s.winner && (
          <p className="text-center text-xs text-muted-foreground mt-2">Winner: <span className="font-medium text-foreground">{s.winner}</span></p>
        )}
      </CardContent>
    </Card>
  );
}

function BracketList({ series }: { series: PlayoffSeries[] }) {
  // 木を持たない縦リストでは「いま何が起きているか」を先に出す＝最新ラウンドが先（plan.md §12-2）
  return (
    <div className="space-y-6 lg:hidden">
      {[4, 3, 2, 1].map((round) => {
        const roundSeries = series.filter((s) => s.round === round);
        if (roundSeries.length === 0) return null;
        return (
          <section key={round}>
            <h2 className="text-lg font-semibold mb-3">{ROUND_NAME[round]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roundSeries.map((s) => (
                <SeriesCard key={`${s.team1}-${s.team2}`} s={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatLeaders({ players, label, getValue }: { players: PlayoffPlayerPerGame[]; label: string; getValue: (p: PlayoffPlayerPerGame) => number }) {
  const top3 = [...players].sort((a, b) => getValue(b) - getValue(a)).slice(0, 3);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top3.map((p, i) => (
          <div key={p.player} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-muted-foreground font-mono">{i + 1}</span>
              <Link href={`/players/${p.playerId}`} className="hover:underline font-medium truncate max-w-[120px]">{p.player}</Link>
              <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: getTeamColor(p.team) }}>{p.team}</Badge>
            </div>
            <span className="font-mono font-semibold">{getValue(p).toFixed(1)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PlayoffsTopClient({
  series,
  bracket,
  players,
  updatedAt,
  season,
}: {
  series: PlayoffSeries[];
  bracket: Bracket;
  players: PlayoffPlayerPerGame[];
  updatedAt?: string;
  season: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NBA {season} Playoffs</h1>
        <p className="text-muted-foreground mt-1">
          プレーオフ ブラケット・スタッツ
          {updatedAt && <span className="ml-3 text-xs">データ更新: {updatedAt}</span>}
        </p>
      </div>

      <BracketTree bracket={bracket} />
      <BracketList series={series} />
      {bracket.unplaced.length > 0 && (
        <section className="hidden lg:block">
          <h2 className="text-lg font-semibold mb-3">その他のシリーズ</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bracket.unplaced.map((s) => (
              <SeriesCard key={`${s.team1}-${s.team2}`} s={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">スタッツリーダー</h2>
          <Link href="/leaders?phase=po" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatLeaders players={players} label="得点 (PTS)" getValue={(p) => p.pts} />
          <StatLeaders players={players} label="リバウンド (REB)" getValue={(p) => p.trb} />
          <StatLeaders players={players} label="アシスト (AST)" getValue={(p) => p.ast} />
        </div>
      </section>
    </div>
  );
}
