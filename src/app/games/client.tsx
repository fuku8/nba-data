"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import type { GameResult } from "@/lib/data/games";
import type { PlayoffSeries } from "@/lib/types";
import { gameDetailUrl } from "@/lib/game-url";
import { PhaseSwitch } from "@/components/phase-switch";
import type { Phase } from "@/lib/phase";

// 熱戦指数(leadChanges + timesTied − 点差)を🔥の数に変換
function dramaFlames(drama: number | undefined): string {
  if (drama == null) return "";
  if (drama >= 20) return "🔥🔥🔥";
  if (drama >= 10) return "🔥🔥";
  if (drama >= 4) return "🔥";
  return "";
}

function GameCard({ game, drama, detailHref }: { game: GameResult; drama?: number; detailHref: string | null }) {
  const inProgress = !game.homeWl; // POはスコアボード補完で進行中の試合が入ることがある
  const homeWin = inProgress ? false : game.homePts > game.awayPts;
  const flames = dramaFlames(drama);
  const linkCls = "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{game.gameDate}</span>
          <div className="flex items-center gap-2">
            {flames && (
              <Link href="/metrics#drama" className="text-xs" title={`熱戦指数 ${drama}（リード交代+同点−点差）· クリックで解説`}>
                {flames}
              </Link>
            )}
            <Badge variant={inProgress ? "outline" : "secondary"} className="text-xs">{inProgress ? "進行中" : "Final"}</Badge>
            {/* チーム名は/teamsへのLinkなのでカード全体はリンク化せず、この行のリンクだけで詳細へ（入れ子のインタラクティブ要素を作らない） */}
            {detailHref ? (
              <Link href={detailHref} className={linkCls} title="ボックススコアを開く">
                ボックススコア →
              </Link>
            ) : (
              <a href={gameDetailUrl(game.gameId)} target="_blank" rel="noopener noreferrer" title="NBA.comの試合詳細を開く" className={linkCls}>
                試合詳細 ↗
              </a>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {[
            { abbr: game.awayTeam, pts: game.awayPts, win: !inProgress && !homeWin, home: false },
            { abbr: game.homeTeam, pts: game.homePts, win: !inProgress && homeWin, home: true },
          ].map((t) => (
            <div key={t.abbr} className={`flex items-center justify-between ${!inProgress && !t.win ? "opacity-60" : ""}`}>
              <Link href={`/teams/${t.abbr}`} className="flex items-center gap-2 hover:underline">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(t.abbr) }} />
                <span className={`font-medium ${t.win ? "font-semibold" : ""}`}>{t.abbr}</span>
                {t.home && <span className="text-xs text-muted-foreground">HOME</span>}
              </Link>
              <span className={`font-mono text-lg ${t.win ? "font-bold" : ""}`}>{inProgress && !t.pts ? "—" : t.pts}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function GamesClient({
  games,
  dates,
  phase,
  poAvailable,
  drama,
  series,
}: {
  games: GameResult[];
  dates: string[];
  phase: Phase;
  poAvailable: boolean;
  drama: Record<string, number>; // PO: 熱戦指数（boxscoreがある試合のみ）
  series: PlayoffSeries[]; // PO: シリーズ状況
}) {
  const [selectedDate, setSelectedDate] = useState(dates[0] || "");

  const filtered = useMemo(() => {
    if (!selectedDate) return games.slice(-20).reverse();
    return games.filter((g) => g.gameDate === selectedDate);
  }, [games, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">試合結果</h1>
            <PhaseSwitch phase={phase} poAvailable={poAvailable} basePath="/games" />
          </div>
          <p className="text-muted-foreground text-sm">
            {games.length} 試合 · 日付は米国東部時間(ET)基準 ·{" "}
            {phase === "po" ? "「ボックススコア」でクォーター別スコアと選手スタッツが開きます" : "「試合詳細」ボタンでNBA.comの試合詳細が開きます"}
          </p>
        </div>
        <Select value={selectedDate} onValueChange={(v) => setSelectedDate(v ?? dates[0])}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="日付を選択" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {dates.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            この日の試合データはありません
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game) => (
            <GameCard
              key={game.gameId}
              game={game}
              drama={drama[game.gameId]}
              detailHref={phase === "po" ? `/games/${game.gameId}` : null}
            />
          ))}
        </div>
      )}

      {phase === "po" && series.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">シリーズ状況</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((s) => (
              <Card key={`${s.team1}-${s.team2}`} className="text-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: getTeamColor(s.team1) }}>{s.team1}</span>
                    <Badge variant={s.winner ? "default" : "secondary"} className="text-xs mx-1">
                      {s.seriesStatus}
                    </Badge>
                    <span style={{ color: getTeamColor(s.team2) }}>{s.team2}</span>
                  </div>
                  {s.winner && <p className="text-xs text-muted-foreground mt-1 text-center">Winner: {s.winner}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
