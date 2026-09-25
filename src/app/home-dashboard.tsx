import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PhaseTabsList } from "@/components/phase-switch";
import { LeagueTerrain } from "@/components/league-terrain";
import { getStandings, getTerrainTeams } from "@/lib/data/teams";
import { getGames } from "@/lib/data/games";
import { getPlayerPerGame } from "@/lib/data/players";
import { getLatestGameDate, getPoLastGameDate } from "@/lib/data/csv-utils";
import { getTeamColor } from "@/lib/constants/teams";
import { teamNameJa, withFullNames } from "@/lib/data/names-ja";
import { isPlayoffDataAvailable, getPlayoffSeries, getPlayoffPlayerPerGame, getPlayoffBracket } from "@/lib/data/playoffs";
import { PlayoffsTopClient, StatLeaders } from "@/app/playoffs/client";
import { currentSeason } from "@/lib/season";
import type { TeamStanding } from "@/lib/types";

// 東西横並びの順位表（スマホでも2列。略称＋勝敗＋勝率だけに絞って1列150px程度に収める）
function ConferenceTable({ title, teams }: { title: string; teams: TeamStanding[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1.5 px-2">{title}</h3>
      <div>
        {teams.map((t, i) => (
          <Link
            key={t.teamAbbr}
            href={`/teams/${t.teamAbbr}`}
            // 6位の下=PO確定線、10位の下=プレイイン線
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs sm:text-sm hover:bg-accent transition-colors ${i === 5 ? "border-b" : ""} ${i === 9 ? "border-b border-dashed" : ""}`}
          >
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <span className="w-4 sm:w-5 text-right text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(t.teamAbbr) }} />
              <span className="font-medium sm:hidden">{t.teamAbbr}</span>
              <span className="font-medium hidden sm:inline truncate">{teamNameJa(t.teamAbbr) ?? t.teamName}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 font-mono tabular-nums">
              <span>{t.wins}-{t.losses}</span>
              <span className="w-8 sm:w-12 text-right">{t.winPct.toFixed(3).replace(/^0/, "")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RegularSeason({ season }: { season: string }) {
  const standings = getStandings();
  const games = getGames();
  // リーダーの母集団: 序盤は誰も30試合に達しないため「最多消化チームの半分」を下限にする
  // （30試合に届いたら以後は30で固定。bleague-data minGp と同型の暫定ゲート）
  const allPlayers = withFullNames(getPlayerPerGame().filter((p) => p.team !== "TOT"));
  const minGp = Math.min(30, Math.max(1, Math.floor(Math.max(0, ...standings.map((s) => s.wins + s.losses)) / 2)));
  const players = allPlayers.filter((p) => p.gp >= minGp);
  const conf = (c: TeamStanding["conference"]) =>
    standings.filter((s) => s.conference === c).sort((a, b) => a.playoffRank - b.playoffRank || b.winPct - a.winPct);

  const terrain = getTerrainTeams();

  // 昨夜の結果帯: 最終取得日の全試合を1行の帯で（詳細は /games）
  const lastDate = games.length > 0 ? games[games.length - 1].gameDate : "";
  const lastGames = games.filter((g) => g.gameDate === lastDate);
  const lastDateShort = lastDate ? `${parseInt(lastDate.slice(5, 7), 10)}/${parseInt(lastDate.slice(8, 10), 10)}` : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NBA {season} Regular Season</h1>
        <p className="text-muted-foreground mt-1">{games.length}試合消化・データ反映: {getLatestGameDate()} (米国東部時間)</p>
      </div>

      {/* 空データ（繰越直後）は非表示。昨季最終図のフォールバックは §13-3 残課題(a) */}
      {terrain.length > 0 && (
        <section>
          <LeagueTerrain teams={terrain} context={`Regular Season ${season}`} asOf={getLatestGameDate()} />
        </section>
      )}

      {lastGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              試合結果 <span className="text-sm font-normal text-muted-foreground">{lastDateShort}</span>
            </h2>
            <Link href="/games" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
          </div>
          {/* スマホ=1行横スクロール、PC=折り返して全件表示（1行スクロールは窮屈・末尾まで見えない） */}
          <div className="rounded-lg border bg-card px-4 py-3 text-sm overflow-x-auto whitespace-nowrap sm:whitespace-normal">
            {lastGames.map((g) => (
              <span key={g.gameId} className="mr-5 inline-block whitespace-nowrap leading-7 text-muted-foreground">
                <span className="font-semibold text-foreground">{g.homeTeam} {g.homePts}</span>-{g.awayPts} {g.awayTeam}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">順位表</h2>
          <Link href="/standings" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-6 rounded-lg border bg-card p-2 sm:p-4">
          <ConferenceTable title="East" teams={conf("East")} />
          <ConferenceTable title="West" teams={conf("West")} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">スタッツリーダー</h2>
          <Link href="/leaders" className="text-sm text-muted-foreground hover:underline">すべて見る →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatLeaders players={players} label="得点 (PTS)" stat="pts" />
          <StatLeaders players={players} label="リバウンド (REB)" stat="trb" />
          <StatLeaders players={players} label="アシスト (AST)" stat="ast" />
        </div>
      </section>
    </div>
  );
}

// トップ `/`（既定 RS）と `/playoffs`（既定 PO）が同じダッシュボードを開くタブを変えて描く。
// 既定は時期で変えない（plan.md §12-2）。POデータが無い時期はタブなしで RS だけ
export function HomeDashboard({ defaultTab }: { defaultTab: "rs" | "po" }) {
  const season = currentSeason();
  if (!isPlayoffDataAvailable()) return <RegularSeason season={season} />;

  const players = withFullNames(getPlayoffPlayerPerGame().filter((p) => p.team !== "TOT"));
  return (
    <Tabs defaultValue={defaultTab} className="gap-6">
      <PhaseTabsList />
      <TabsContent value="rs" className="text-base">
        <RegularSeason season={season} />
      </TabsContent>
      <TabsContent value="po" className="text-base">
        <PlayoffsTopClient series={getPlayoffSeries()} bracket={getPlayoffBracket()} players={players} updatedAt={getPoLastGameDate()} season={season} />
      </TabsContent>
    </Tabs>
  );
}
