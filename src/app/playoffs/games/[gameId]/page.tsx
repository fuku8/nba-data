import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeamColor } from "@/lib/constants/teams";

export const revalidate = 3600;

// ─── Types ──────────────────────────────────────────────────

interface TeamScore {
  teamId: number;
  tricode: string;
  wins: number;
  losses: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  score: number;
  isHome: boolean;
}

interface TeamStats {
  teamId: number;
  tricode: string;
  points: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsPercentage: number;
  threePointersPercentage: number;
  freeThrowsPercentage: number;
  pointsInThePaint: number;
  pointsFastBreak: number;
  benchPoints: number;
  biggestLead: number;
  leadChanges: number;
  timesTied: number;
}

interface PlayerStats {
  personId: number;
  name: string;
  teamId: number;
  tricode: string;
  position: string;
  minutes: string;
  points: number;
  reboundsTotal: number;
  reboundsOffensive: number;
  reboundsDefensive: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  foulsPersonal: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalsPercentage: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointersPercentage: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowsPercentage: number;
  plusMinusPoints: number;
}

interface BoxScore {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  gameTimeUTC: string;
  teams: TeamScore[];
  teamStats: TeamStats[];
  players: PlayerStats[];
}

// ─── Data loader ────────────────────────────────────────────

function getBoxScore(gameId: string): BoxScore | null {
  const p = path.join(process.cwd(), "data", "boxscores", `${gameId}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as BoxScore;
  } catch {
    return null;
  }
}

// ─── Sub-components ─────────────────────────────────────────

function pct(v: number | null | undefined) {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}

function fmt(v: number | null | undefined, decimals = 0) {
  if (v == null) return "—";
  return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
}

function ScoreHeader({ away, home }: { away: TeamScore; home: TeamScore }) {
  const awayWin = away.score > home.score;
  const homeWin = home.score > away.score;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        {/* Away */}
        <div className={`flex-1 text-center ${awayWin ? "" : "opacity-50"}`}>
          <Link href={`/playoffs/teams/${away.tricode}`}>
            <div className="h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: getTeamColor(away.tricode) }}>
              {away.tricode}
            </div>
          </Link>
          <div className={`text-5xl font-bold font-mono ${awayWin ? "" : "text-muted-foreground"}`}>{away.score}</div>
          <div className="text-sm text-muted-foreground mt-1">{away.wins}-{away.losses}</div>
        </div>

        {/* Center */}
        <div className="text-center px-4">
          <div className="text-xs text-muted-foreground mb-1">FINAL</div>
          <div className="text-2xl font-bold text-muted-foreground">vs</div>
          <div className="text-xs text-muted-foreground mt-1">HOME: {home.tricode}</div>
        </div>

        {/* Home */}
        <div className={`flex-1 text-center ${homeWin ? "" : "opacity-50"}`}>
          <Link href={`/playoffs/teams/${home.tricode}`}>
            <div className="h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: getTeamColor(home.tricode) }}>
              {home.tricode}
            </div>
          </Link>
          <div className={`text-5xl font-bold font-mono ${homeWin ? "" : "text-muted-foreground"}`}>{home.score}</div>
          <div className="text-sm text-muted-foreground mt-1">{home.wins}-{home.losses}</div>
        </div>
      </div>
    </div>
  );
}

function QuarterScores({ away, home }: { away: TeamScore; home: TeamScore }) {
  const quarters = [
    { label: "Q1", a: away.q1, h: home.q1 },
    { label: "Q2", a: away.q2, h: home.q2 },
    { label: "Q3", a: away.q3, h: home.q3 },
    { label: "Q4", a: away.q4, h: home.q4 },
  ];

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-20">チーム</th>
            {quarters.map((q) => (
              <th key={q.label} className="py-3 px-4 text-center font-medium text-muted-foreground">{q.label}</th>
            ))}
            <th className="py-3 px-4 text-center font-bold">合計</th>
          </tr>
        </thead>
        <tbody>
          {[
            { team: away, vals: quarters.map((q) => q.a) },
            { team: home, vals: quarters.map((q) => q.h) },
          ].map(({ team, vals }) => {
            const won = team.score > (team === away ? home.score : away.score);
            return (
              <tr key={team.tricode} className="border-b last:border-0">
                <td className="py-3 px-4">
                  <Link href={`/playoffs/teams/${team.tricode}`} className="flex items-center gap-2 hover:underline font-medium">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(team.tricode) }} />
                    {team.tricode}
                    {team.isHome && <span className="text-xs text-muted-foreground">H</span>}
                  </Link>
                </td>
                {vals.map((v, i) => (
                  <td key={i} className="py-3 px-4 text-center font-mono">{v ?? "—"}</td>
                ))}
                <td className={`py-3 px-4 text-center font-mono font-bold text-base ${won ? "" : "text-muted-foreground"}`}>
                  {team.score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamStatsComparison({ away, home, awayStats, homeStats }: { away: TeamScore; home: TeamScore; awayStats: TeamStats; homeStats: TeamStats }) {
  const rows: { label: string; aVal: string; hVal: string; higherIsBetter?: boolean }[] = [
    { label: "FG%",        aVal: pct(awayStats.fieldGoalsPercentage),    hVal: pct(homeStats.fieldGoalsPercentage),    higherIsBetter: true },
    { label: "3P%",        aVal: pct(awayStats.threePointersPercentage), hVal: pct(homeStats.threePointersPercentage), higherIsBetter: true },
    { label: "FT%",        aVal: pct(awayStats.freeThrowsPercentage),    hVal: pct(homeStats.freeThrowsPercentage),    higherIsBetter: true },
    { label: "REB",        aVal: fmt(awayStats.reboundsTotal),           hVal: fmt(homeStats.reboundsTotal),           higherIsBetter: true },
    { label: "AST",        aVal: fmt(awayStats.assists),                 hVal: fmt(homeStats.assists),                 higherIsBetter: true },
    { label: "STL",        aVal: fmt(awayStats.steals),                  hVal: fmt(homeStats.steals),                  higherIsBetter: true },
    { label: "BLK",        aVal: fmt(awayStats.blocks),                  hVal: fmt(homeStats.blocks),                  higherIsBetter: true },
    { label: "TOV",        aVal: fmt(awayStats.turnovers),               hVal: fmt(homeStats.turnovers),               higherIsBetter: false },
    { label: "ペイント得点", aVal: fmt(awayStats.pointsInThePaint),       hVal: fmt(homeStats.pointsInThePaint),        higherIsBetter: true },
    { label: "速攻得点",    aVal: fmt(awayStats.pointsFastBreak),        hVal: fmt(homeStats.pointsFastBreak),         higherIsBetter: true },
    { label: "ベンチ得点",  aVal: fmt(awayStats.benchPoints),            hVal: fmt(homeStats.benchPoints),             higherIsBetter: true },
    { label: "最大リード",  aVal: fmt(awayStats.biggestLead),            hVal: fmt(homeStats.biggestLead),             higherIsBetter: true },
  ];

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm" style={{ color: getTeamColor(away.tricode) }}>{away.tricode}</span>
        <span className="text-sm font-medium text-muted-foreground">チームスタッツ</span>
        <span className="font-semibold text-sm" style={{ color: getTeamColor(home.tricode) }}>{home.tricode}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => {
            const aNum = parseFloat(row.aVal);
            const hNum = parseFloat(row.hVal);
            const aWin = !isNaN(aNum) && !isNaN(hNum) && (row.higherIsBetter ? aNum > hNum : aNum < hNum);
            const hWin = !isNaN(aNum) && !isNaN(hNum) && (row.higherIsBetter ? hNum > aNum : hNum < aNum);
            return (
              <tr key={row.label} className="border-b last:border-0">
                <td className={`py-2.5 px-4 text-center font-mono w-24 ${aWin ? "font-bold" : "text-muted-foreground"}`}>{row.aVal}</td>
                <td className="py-2.5 px-4 text-center text-muted-foreground text-xs">{row.label}</td>
                <td className={`py-2.5 px-4 text-center font-mono w-24 ${hWin ? "font-bold" : "text-muted-foreground"}`}>{row.hVal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayerTable({ players, tricode }: { players: PlayerStats[]; tricode: string }) {
  const active = players.filter((p) => p.minutes && p.minutes !== "");
  const sorted = [...active].sort((a, b) => b.points - a.points);

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(tricode) }} />
        <span className="font-semibold text-sm">{tricode}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">選手</th>
            <th className="py-2 px-2 text-center text-muted-foreground">POS</th>
            <th className="py-2 px-2 text-center text-muted-foreground">MIN</th>
            <th className="py-2 px-2 text-center font-semibold">PTS</th>
            <th className="py-2 px-2 text-center text-muted-foreground">REB</th>
            <th className="py-2 px-2 text-center text-muted-foreground">AST</th>
            <th className="py-2 px-2 text-center text-muted-foreground">STL</th>
            <th className="py-2 px-2 text-center text-muted-foreground">BLK</th>
            <th className="py-2 px-2 text-center text-muted-foreground">TOV</th>
            <th className="py-2 px-2 text-center text-muted-foreground">FG</th>
            <th className="py-2 px-2 text-center text-muted-foreground">3P</th>
            <th className="py-2 px-2 text-center text-muted-foreground">FT</th>
            <th className="py-2 px-2 text-center text-muted-foreground">+/-</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const pm = p.plusMinusPoints ?? 0;
            return (
              <tr key={p.personId} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2 px-3 font-medium">
                  <Link href={`/players/${p.personId}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="py-2 px-2 text-center text-muted-foreground">{p.position || "—"}</td>
                <td className="py-2 px-2 text-center font-mono text-muted-foreground">{p.minutes}</td>
                <td className="py-2 px-2 text-center font-mono font-bold">{p.points}</td>
                <td className="py-2 px-2 text-center font-mono">{p.reboundsTotal}</td>
                <td className="py-2 px-2 text-center font-mono">{p.assists}</td>
                <td className="py-2 px-2 text-center font-mono">{p.steals}</td>
                <td className="py-2 px-2 text-center font-mono">{p.blocks}</td>
                <td className="py-2 px-2 text-center font-mono">{p.turnovers}</td>
                <td className="py-2 px-2 text-center font-mono">{p.fieldGoalsMade}/{p.fieldGoalsAttempted}</td>
                <td className="py-2 px-2 text-center font-mono">{p.threePointersMade}/{p.threePointersAttempted}</td>
                <td className="py-2 px-2 text-center font-mono">{p.freeThrowsMade}/{p.freeThrowsAttempted}</td>
                <td className={`py-2 px-2 text-center font-mono ${pm > 0 ? "text-green-400" : pm < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                  {pm > 0 ? "+" : ""}{pm}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const box = getBoxScore(gameId);
  if (!box) notFound();

  const away = box.teams.find((t) => !t.isHome);
  const home = box.teams.find((t) => t.isHome);
  if (!away || !home) notFound();

  const awayStats = box.teamStats.find((t) => t.tricode === away.tricode);
  const homeStats = box.teamStats.find((t) => t.tricode === home.tricode);

  const awayPlayers = box.players.filter((p) => p.tricode === away.tricode);
  const homePlayers = box.players.filter((p) => p.tricode === home.tricode);

  const gameDate = box.gameTimeUTC
    ? new Date(box.gameTimeUTC).toLocaleDateString("ja-JP", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/playoffs/games" className="hover:underline">← 試合一覧</Link>
        {gameDate && <span>· {gameDate} (ET)</span>}
        <span>· {box.gameStatusText}</span>
      </div>

      <ScoreHeader away={away} home={home} />

      <QuarterScores away={away} home={home} />

      {awayStats && homeStats && (
        <TeamStatsComparison away={away} home={home} awayStats={awayStats} homeStats={homeStats} />
      )}

      {box.players.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">選手スタッツ</h2>
          <PlayerTable players={awayPlayers} tricode={away.tricode} />
          <PlayerTable players={homePlayers} tricode={home.tricode} />
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">
          選手スタッツは試合終了後に更新されます
        </div>
      )}
    </div>
  );
}
