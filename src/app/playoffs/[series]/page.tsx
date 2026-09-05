import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta, phaseTitle } from "@/lib/metadata";
import { getPlayoffSeries } from "@/lib/data/playoffs";
import { getGames, getDramaScores, findBoxScore } from "@/lib/data/games";
import { getTeamColor } from "@/lib/constants/teams";
import { teamNameJa } from "@/lib/data/names-ja";
import { gameDetailUrl } from "@/lib/game-url";
import { PhaseBadge } from "@/components/phase-switch";
import { ROUND_NAME } from "@/lib/bracket";
import { dramaFlames } from "@/lib/drama";

export const dynamicParams = false;

// slug は po_series.csv の並びどおり "team1-team2"（例: NYK-ATL）
function findSeries(slug: string) {
  return getPlayoffSeries().find((s) => `${s.team1}-${s.team2}` === slug);
}

export function generateStaticParams() {
  return getPlayoffSeries().map((s) => ({ series: `${s.team1}-${s.team2}` }));
}

export async function generateMetadata({ params }: { params: Promise<{ series: string }> }): Promise<Metadata> {
  const { series } = await params;
  const s = findSeries(series);
  if (!s) return {};
  const ja1 = teamNameJa(s.team1) ?? s.team1;
  const ja2 = teamNameJa(s.team2) ?? s.team2;
  return pageMeta({
    title: `${ja1} vs ${ja2}（${ROUND_NAME[s.round]}）· ${phaseTitle("po")}`,
    description: `${phaseTitle("po")} ${ROUND_NAME[s.round]} ${s.team1}-${s.team2} の全試合結果と各試合のボックススコア。`,
    path: `/playoffs/${series}`,
  });
}

export default async function SeriesPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  const s = findSeries(series);
  if (!s) notFound();

  const games = getGames({ phase: "po" })
    .filter((g) => (g.homeTeam === s.team1 && g.awayTeam === s.team2) || (g.homeTeam === s.team2 && g.awayTeam === s.team1))
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  const drama = getDramaScores();

  const ja1 = teamNameJa(s.team1) ?? s.team1;
  const ja2 = teamNameJa(s.team2) ?? s.team2;
  const linkCls = "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  const teamSide = (abbr: string, ja: string) => (
    <Link href={`/teams/${abbr}`} className={`flex items-center gap-2 hover:underline ${s.winner === abbr ? "" : s.winner ? "opacity-60" : ""}`}>
      <span className="h-3 w-3 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(abbr) }} />
      {ja}
    </Link>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/playoffs" className="hover:underline">← プレーオフ</Link>
        <PhaseBadge phase="po" />
        <span>· {ROUND_NAME[s.round]}</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-x-3 gap-y-1 flex-wrap">
          {teamSide(s.team1, ja1)}
          <span className="font-mono">{s.team1Wins}-{s.team2Wins}</span>
          {teamSide(s.team2, ja2)}
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {s.winner
            ? `${teamNameJa(s.winner) ?? s.winner} がシリーズ勝利（${s.seriesStatus}）`
            : `進行中（${s.seriesStatus}）`}
          {" "}· 日付は米国東部時間(ET)基準
        </p>
      </div>

      <div className="space-y-1.5">
        {games.map((g, i) => {
          const inProgress = !g.homeWl;
          const homeWin = !inProgress && g.homePts > g.awayPts;
          const score = drama.get(g.gameId);
          const flames = dramaFlames(score);
          const hasBox = findBoxScore(g.gameId) != null;
          const side = (abbr: string, pts: number, win: boolean) => (
            <span className={`flex items-center gap-1.5 ${win ? "font-bold" : inProgress ? "" : "opacity-60"}`}>
              <span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(abbr) }} />
              {abbr}
              <span className="font-mono">{inProgress && !pts ? "—" : pts}</span>
            </span>
          );
          return (
            <div key={g.gameId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-card px-3 py-2 text-sm">
              <span className="font-mono text-muted-foreground w-7">G{i + 1}</span>
              <span className="text-xs text-muted-foreground">{g.gameDate}</span>
              {side(g.awayTeam, g.awayPts, !inProgress && !homeWin)}
              <span className="text-xs text-muted-foreground" title="左=ビジター・右=ホーム">@</span>
              {side(g.homeTeam, g.homePts, homeWin)}
              {flames && (
                <Link href="/metrics#drama" title={`熱戦指数 ${score}（リード交代+同点−点差）· クリックで解説`}>
                  {flames}
                </Link>
              )}
              <span className="ml-auto">
                {hasBox ? (
                  <Link href={`/games/${g.gameId}`} className={linkCls} title="ボックススコアを開く">
                    ボックススコア →
                  </Link>
                ) : (
                  <a href={gameDetailUrl(g.gameId)} target="_blank" rel="noopener noreferrer" className={linkCls} title="NBA.comの試合詳細を開く">
                    試合詳細 ↗
                  </a>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
