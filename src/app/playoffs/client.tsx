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
            <Link href={`/teams/${abbr}`} className={`flex items-center gap-1.5 truncate hover:underline ${won ? "font-bold" : ""}`}>
              <span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(t.name) }} />
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

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <Link href={`/teams/${getTeamAbbr(s.team1)}`} className="text-sm font-semibold truncate w-full flex items-center justify-center gap-1.5 hover:underline"><span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(s.team1) }} />{s.team1}</Link>
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
            <Link href={`/teams/${getTeamAbbr(s.team2)}`} className="text-sm font-semibold truncate w-full flex items-center justify-center gap-1.5 hover:underline"><span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(s.team2) }} />{s.team2}</Link>
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

// 1行表示「NYK 4-1 SAS」。勝者太字・敗者薄く・進行中は橙枠
function SeriesRow({ s }: { s: PlayoffSeries }) {
  const inProgress = !s.winner;
  const side = (name: string, right: boolean) => {
    const won = !inProgress && s.winner === name;
    return (
      <Link
        href={`/teams/${getTeamAbbr(name)}`}
        className={`flex items-center gap-1.5 hover:underline ${right ? "flex-row-reverse" : ""} ${won ? "font-bold" : ""} ${!inProgress && !won ? "opacity-50" : ""}`}
      >
        <span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(name) }} />
        {getTeamAbbr(name)}
      </Link>
    );
  };
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm ${inProgress ? "border-orange-500/60" : ""}`}>
      <div className="flex justify-end">{side(s.team1, false)}</div>
      <span className={`font-mono font-semibold tabular-nums ${inProgress ? "text-orange-500" : ""}`}>{s.team1Wins}-{s.team2Wins}</span>
      <div className="flex justify-start">{side(s.team2, true)}</div>
    </div>
  );
}

function LeadersGrid({ players }: { players: PlayoffPlayerPerGame[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatLeaders players={players} label="得点 (PTS)" stat="pts" />
      <StatLeaders players={players} label="リバウンド (REB)" stat="trb" />
      <StatLeaders players={players} label="アシスト (AST)" stat="ast" />
    </div>
  );
}

const SUMMARY_CLASS = "cursor-pointer text-sm font-semibold text-muted-foreground mb-1.5 select-none";

function BracketList({ series, players }: { series: PlayoffSeries[]; players: PlayoffPlayerPerGame[] }) {
  // 木を持たない縦リストでは「いま何が起きているか」を先に出す＝最新ラウンドが先（plan.md §12-2）
  // ファイナル・カンファレンス決勝と進行中のラウンドは開き、終わった1・2回戦は畳む（スマホの縦長対策）。リーダーは RS タブと同じく常に開く
  return (
    <div className="space-y-4 lg:hidden">
      {[4, 3, 2, 1].map((round) => {
        const roundSeries = series.filter((s) => s.round === round);
        if (roundSeries.length === 0) return null;
        const open = round >= 3 || roundSeries.some((s) => !s.winner);
        return (
          <details key={round} open={open}>
            <summary className={SUMMARY_CLASS}>{ROUND_NAME[round]}（{roundSeries.length}）</summary>
            <div className="space-y-1.5">
              {roundSeries.map((s) => (
                <SeriesRow key={`${s.team1}-${s.team2}`} s={s} />
              ))}
            </div>
          </details>
        );
      })}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">スタッツリーダー</h2>
          <Link href="/leaders/po" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <LeadersGrid players={players} />
      </section>
    </div>
  );
}

type LeaderStat = "pts" | "trb" | "ast";
type LeaderRow = { playerId: number; player: string; team: string } & Record<LeaderStat, number>;

// トップ3のカード。RS/PO どちらの per-game 行でも使う（トップのRSタブと共用）。
// サーバー側からも呼ぶので関数ではなく統計キーを受け取る
export function StatLeaders({ players, label, stat }: { players: LeaderRow[]; label: string; stat: LeaderStat }) {
  const top3 = [...players].sort((a, b) => b[stat] - a[stat]).slice(0, 3);
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
            <span className="font-mono font-semibold">{p[stat].toFixed(1)}</span>
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
          {updatedAt && <span className="ml-3 text-xs">最終試合: {updatedAt} (ET)</span>}
        </p>
      </div>

      <BracketTree bracket={bracket} />
      <BracketList series={series} players={players} />
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

      <section className="hidden lg:block">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">スタッツリーダー</h2>
          <Link href="/leaders/po" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <LeadersGrid players={players} />
      </section>
    </div>
  );
}
