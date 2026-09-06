import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/metadata";
import { teamNameJa, withDisplayNames, withFullNames } from "@/lib/data/names-ja";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStandings, getTeamAdvanced, getTeamPerGame, getTeamPointsGini, getTeamDefenseFactors, getTeamOffenseFactors, GINI_MIN_MP } from "@/lib/data/teams";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerTotals } from "@/lib/data/players";
import { getTeamMargins } from "@/lib/data/games";
import { SeasonHeartbeat } from "@/components/season-heartbeat";
import { LorenzCurve } from "@/components/lorenz-curve";
import { PossessionBand } from "@/components/possession-band";
import { FactorRanks, type FactorRankRow } from "@/components/factor-ranks";
import { getPlayerPossessions } from "@/lib/data/tracking";
import { MetricLink } from "@/components/metric-link";
import { NBA_TEAMS, getTeamAbbr, getTeamColor } from "@/lib/constants/teams";
import { TeamRosterTable } from "./roster-table";
import { getPlayoffSeries, getPlayoffPlayerPerGame, getPlayoffPlayerAdvanced, getPlayoffTeamStats, isPlayoffDataAvailable } from "@/lib/data/playoffs";
import { RosterClient } from "./po-roster-client";
import { PhaseTabsList } from "@/components/phase-switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SeasonTitle } from "@/components/season-title";
import { currentSeason } from "@/lib/season";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const { teamId } = await params;
  const abbr = teamId.toUpperCase();
  const info = NBA_TEAMS[abbr];
  if (!info) return {};
  const st = getStandings().find((s) => s.teamAbbr === abbr);
  const rec = st ? `成績 ${st.wins}-${st.losses}、` : "";
  // 日本語名を主・英語名を従の併記（plan §13-1 段階1。検索流入用で、画面表示は変えない）
  const ja = teamNameJa(abbr);
  return pageMeta({
    title: `${ja ? `${ja}（${info.name}）` : info.name} · NBA ${currentSeason()}`,
    description: `${ja ?? info.name}（${abbr}）の NBA ${currentSeason()} シーズン。${rec}レーティング・Season Heartbeat・ワンマン度・攻撃/守備4ファクター・ボール支配・チームスタッツ・ロスター${isPlayoffDataAvailable() ? "・プレーオフ成績" : ""}。`,
    path: `/teams/${abbr}`,
  });
}

export function generateStaticParams() {
  return Object.keys(NBA_TEAMS).map((teamId) => ({ teamId }));
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    // スマホはラベルと数値の間隔（カード既定の gap-4 ＋ pb-2）を詰めて、正式名も極小フォントで残す（3列のまま折り返し）
    <Card className="gap-1 sm:gap-4">
      <CardHeader className="pb-0 sm:pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
        {sub && <p className="text-[10px] sm:text-xs leading-tight sm:leading-normal break-words text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const abbr = teamId.toUpperCase();
  const teamInfo = NBA_TEAMS[abbr];
  if (!teamInfo) notFound();

  const standings = getStandings();
  const advanced = getTeamAdvanced();
  const perGame = getTeamPerGame();
  const allPlayers = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();

  const standing = standings.find((s) => s.teamAbbr === abbr);
  const adv = advanced.find((a) => getTeamAbbr(a.teamName) === abbr);
  const pg = perGame.find((p) => getTeamAbbr(p.teamName) === abbr);

  const margins = getTeamMargins(abbr);

  // ワンマン度: チーム内得点分布のGini係数（MIN200以上でゴミ時間出場を除外）とリーグ内順位
  const giniByTeam = getTeamPointsGini();
  const teamGini = giniByTeam.find((g) => g.team === abbr);
  const giniRank = teamGini ? giniByTeam.indexOf(teamGini) + 1 : null;
  const teamScorers = withFullNames(teamGini?.players ?? []); // 説明文の最多得点者名もフル日本語名に
  const teamTotalPts = getPlayerTotals()
    .filter((p) => p.team === abbr)
    .reduce((a, p) => a + p.pts, 0);
  const topShare = teamScorers.length > 0 && teamTotalPts > 0
    ? teamScorers[0].pts / teamTotalPts
    : 0;

  // ボール支配の帯: シーズン総タッチ数（タッチ/試合 × GP）のチーム内シェア
  const teamPoss = withDisplayNames(getPlayerPossessions().filter((p) => p.team === abbr && p.gp > 0))
    .map((p) => ({ name: p.player, total: p.touches * p.gp }))
    .sort((a, b) => b.total - a.total);
  const possTotal = teamPoss.reduce((a, p) => a + p.total, 0);
  const TOP_N = 8;
  const possSegments = possTotal > 0
    ? [
        ...teamPoss.slice(0, TOP_N).map((p) => ({ name: p.name, share: p.total / possTotal })),
        ...(teamPoss.length > TOP_N
          ? [{ name: "その他", share: teamPoss.slice(TOP_N).reduce((a, p) => a + p.total, 0) / possTotal }]
          : []),
      ]
    : [];

  // 攻撃・守備4ファクター: 各部門のリーグ内順位（1位=最良。「低いほど良い」指標は昇順で順位付け）
  const rankIn = <T extends { team: string }>(rows: T[], value: (t: T) => number, lowerIsBetter: boolean) =>
    [...rows].sort((a, b) => (lowerIsBetter ? value(a) - value(b) : value(b) - value(a))).findIndex((t) => t.team === abbr) + 1;
  const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

  const defFactors = getTeamDefenseFactors();
  const myDef = defFactors.find((t) => t.team === abbr);
  const defenseRows: FactorRankRow[] = myDef
    ? [
        { label: "シュート抑止", metric: "被eFG%", value: pct1(myDef.oppEfg), rank: rankIn(defFactors, (t) => t.oppEfg, true) },
        { label: "ボール奪取", metric: "奪TOV率", value: pct1(myDef.oppTovPct), rank: rankIn(defFactors, (t) => t.oppTovPct, false) },
        { label: "リバウンド", metric: "DRB%", value: pct1(myDef.drebPct), rank: rankIn(defFactors, (t) => t.drebPct, false) },
        { label: "ファウル抑制", metric: "被FTレート", value: pct1(myDef.oppFtRate), rank: rankIn(defFactors, (t) => t.oppFtRate, true) },
      ]
    : [];

  const offFactors = getTeamOffenseFactors();
  const myOff = offFactors.find((t) => t.team === abbr);
  const offenseRows: FactorRankRow[] = myOff
    ? [
        { label: "シュート効率", metric: "eFG%", value: pct1(myOff.efgPct), rank: rankIn(offFactors, (t) => t.efgPct, false) },
        { label: "ボール保持", metric: "TOV率", value: pct1(myOff.tovPct), rank: rankIn(offFactors, (t) => t.tovPct, true) },
        { label: "攻撃リバウンド", metric: "ORB%", value: pct1(myOff.orebPct), rank: rankIn(offFactors, (t) => t.orebPct, false) },
        { label: "FT獲得", metric: "FTレート", value: pct1(myOff.ftRate), rank: rankIn(offFactors, (t) => t.ftRate, false) },
      ]
    : [];

  const roster = allPlayers.filter((p) => p.team === abbr && p.gp >= 1);
  const rosterAdvanced = new Map(
    allAdvanced.filter((p) => p.team === abbr).map((p) => [p.player, p])
  );

  // 表示名はフル日本語名（plan §13-1）。advanced 照合（英語名キー）の後に差し替える
  const rosterRows = withFullNames(roster.map((player) => {
    const advancedStats = rosterAdvanced.get(player.player);

    return {
      playerId: player.playerId,
      player: player.player,
      gp: player.gp,
      mpg: player.mpg,
      pts: player.pts,
      trb: player.trb,
      ast: player.ast,
      stl: player.stl,
      blk: player.blk,
      fgPct: player.fgPct,
      threePtPct: player.threePtPct,
      offRating: advancedStats?.offRating ?? null,
      defRating: advancedStats?.defRating ?? null,
      netRating: advancedStats?.netRating ?? null,
      tsPct: advancedStats?.tsPct ?? null,
    };
  }));

  // プレーオフ（出場チームのみ）。トップと同じ RS｜PO タブで出す（既定 RS・時期で変えない plan.md §12-2）
  const poAvailable = isPlayoffDataAvailable();
  const teamSeries = poAvailable
    ? getPlayoffSeries().filter((s) => getTeamAbbr(s.team1) === abbr || getTeamAbbr(s.team2) === abbr)
    : [];
  const poTeamStats = teamSeries.length > 0 ? getPlayoffTeamStats().find((t) => t.team === abbr) : undefined;
  const poAdvById = new Map(getPlayoffPlayerAdvanced().filter((p) => p.team === abbr).map((p) => [p.playerId, p]));
  const poPlayers = teamSeries.length > 0
    ? withFullNames(getPlayoffPlayerPerGame()
        .filter((p) => p.team === abbr)
        .map((p) => {
          const a = poAdvById.get(p.playerId);
          return { ...p, offRating: a?.offRating ?? null, defRating: a?.defRating ?? null, netRating: a?.netRating ?? null };
        }))
    : [];

  const playoffSection = (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {teamSeries.map((s) => {
          const isTeam1 = getTeamAbbr(s.team1) === abbr;
          const myWins = isTeam1 ? s.team1Wins : s.team2Wins;
          const oppWins = isTeam1 ? s.team2Wins : s.team1Wins;
          const oppAbbr = getTeamAbbr(isTeam1 ? s.team2 : s.team1);
          const won = s.winner && getTeamAbbr(s.winner) === abbr;
          const lost = s.winner && getTeamAbbr(s.winner) !== abbr;
          return (
            // カード全体でシリーズ詳細（試合一覧→ボックススコア）へ。相手チームのリンクは relative で上に残す
            <Card key={`${s.team1}-${s.team2}`} className="relative transition-colors hover:bg-accent/40">
              <Link href={`/playoffs/${s.team1}-${s.team2}`} className="absolute inset-0" aria-label="シリーズ詳細" />
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{s.roundName}</Badge>
                  {won && <Badge className="text-xs bg-green-600 text-white border-0">勝利</Badge>}
                  {lost && <Badge variant="destructive" className="text-xs">敗退</Badge>}
                  {!s.winner && <Badge variant="secondary" className="text-xs">進行中</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(abbr) }} />{abbr}</span>
                  <span className="text-xl font-bold mx-3">{myWins} - {oppWins}</span>
                  <Link href={`/teams/${oppAbbr}`} className="relative font-semibold flex items-center gap-1.5 hover:underline"><span className="h-2.5 w-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: getTeamColor(oppAbbr) }} />{oppAbbr}</Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {poTeamStats && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {[
            { label: "PTS", value: poTeamStats.pts },
            { label: "REB", value: poTeamStats.reb },
            { label: "AST", value: poTeamStats.ast },
            { label: "STL", value: poTeamStats.stl },
            { label: "BLK", value: poTeamStats.blk },
            { label: "TOV", value: poTeamStats.tov },
            { label: "FG%", value: poTeamStats.fgPct, pct: true },
            { label: "3P%", value: poTeamStats.fg3Pct, pct: true },
            { label: "FT%", value: poTeamStats.ftPct, pct: true },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <div className="text-lg font-semibold font-mono">{stat.pct ? (stat.value * 100).toFixed(1) + "%" : stat.value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">ロスター — プレーオフ スタッツ</h3>
        <RosterClient players={poPlayers} />
      </div>
    </div>
  );

  const regularSeason = (
    <div className="space-y-6">
        {/* スマホは 3+2 の2行（縦積みだと冒頭で縦幅を取りすぎる）。PC は従来どおり5列 */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-4">
          <StatCard
            label="ORtg"
            value={adv?.offRating.toFixed(1) ?? "-"}
            sub="Offensive Rating"
          />
          <StatCard
            label="DRtg"
            value={adv?.defRating.toFixed(1) ?? "-"}
            sub="Defensive Rating"
          />
          <StatCard
            label="NRtg"
            value={
              adv ? `${adv.netRating > 0 ? "+" : ""}${adv.netRating.toFixed(1)}` : "-"
            }
            sub="Net Rating"
          />
          <StatCard
            label="Pace"
            value={adv?.pace.toFixed(1) ?? "-"}
            sub="Possessions / 48min"
          />
          <StatCard
            label="PIE"
            value={adv?.pie != null ? (adv.pie * 100).toFixed(1) + "%" : "-"}
            sub="Player Impact Estimate"
          />
        </div>

        {/* シーズン心電図 & ワンマン度（PCでは横並び） */}
        <div className="grid gap-6 lg:grid-cols-2">
          {margins.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Season Heartbeat</CardTitle>
                  <MetricLink anchor="heartbeat" />
                </div>
                <p className="text-xs text-muted-foreground">全{margins.length}試合の点差 · 上=勝ち / 下=負け · バーをクリックすると詳細と「試合詳細」ボタン（NBA.comへ）が表示されます</p>
              </CardHeader>
              <CardContent>
                <SeasonHeartbeat games={margins} />
              </CardContent>
            </Card>
          )}

          {teamGini && teamScorers.length >= 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>
                    ワンマン度 {teamGini.gini.toFixed(3)} · 偏り NBA{giniRank}位 / {giniByTeam.length}チーム
                  </CardTitle>
                  <MetricLink anchor="one-man" />
                </div>
                <p className="text-xs text-muted-foreground">
                  得点分布の偏り（Gini係数・MIN{GINI_MIN_MP}以上、1位=最も偏っている） · 最多得点者
                  {teamScorers[0].player}がチーム得点の{(topShare * 100).toFixed(1)}%
                  · トレード選手はシーズン通算を現所属に計上
                </p>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LorenzCurve values={teamScorers.map((p) => p.pts)} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* 攻撃・守備4ファクター（同じ形の図を横並びにして攻守のスタイルを見比べる） */}
        <div className="grid gap-6 lg:grid-cols-2">
          {offenseRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>攻撃4ファクター</CardTitle>
                  <MetricLink anchor="offense-factors" />
                </div>
                <p className="text-xs text-muted-foreground">
                  何で点を取るチームか — シュート効率・ボールを失わない・攻撃リバウンド・FTを得る、のリーグ{offFactors.length}チーム中の順位
                </p>
              </CardHeader>
              <CardContent>
                <FactorRanks rows={offenseRows} teams={offFactors.length} color={teamInfo.primaryColor} />
              </CardContent>
            </Card>
          )}

          {defenseRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>守備4ファクター</CardTitle>
                  <MetricLink anchor="defense-factors" />
                </div>
                <p className="text-xs text-muted-foreground">
                  何で守るチームか — シュートを抑える・ボールを奪う・リバウンドで終わらせる・ファウルを与えない、のリーグ{defFactors.length}チーム中の順位
                </p>
              </CardHeader>
              <CardContent>
                <FactorRanks rows={defenseRows} teams={defFactors.length} color={teamInfo.primaryColor} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ボール支配の帯 */}
        {possSegments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>ボール支配</CardTitle>
                <MetricLink anchor="possession" />
              </div>
              <p className="text-xs text-muted-foreground">
                シーズン総タッチ数のチーム内シェア（上位{TOP_N}人＋その他） · ボールが誰の手を経由するか · トレード選手はシーズン通算を現所属に計上
              </p>
            </CardHeader>
            <CardContent>
              <PossessionBand segments={possSegments} color={teamInfo.primaryColor} />
            </CardContent>
          </Card>
        )}

        {/* チームスタッツ */}
        {pg && (
          <Card>
            <CardHeader>
              <CardTitle>Team Stats (Per Game)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
                {[
                  { label: "PTS", value: pg.pts },
                  { label: "REB", value: pg.reb },
                  { label: "AST", value: pg.ast },
                  { label: "STL", value: pg.stl },
                  { label: "BLK", value: pg.blk },
                  { label: "TOV", value: pg.tov },
                  { label: "FG%", value: pg.fgPct, pct: true },
                  { label: "3P%", value: pg.fg3Pct, pct: true },
                  { label: "FT%", value: pg.ftPct, pct: true },
                  { label: "ORB", value: pg.oreb },
                  { label: "DRB", value: pg.dreb },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="text-lg font-semibold font-mono">
                      {stat.pct
                        ? (stat.value * 100).toFixed(1) + "%"
                        : stat.value.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* ロスター */}
        <Card>
          <CardHeader>
            <CardTitle>Roster ({rosterRows.length} players)</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamRosterTable rows={rosterRows} />
          </CardContent>
        </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <SeasonTitle season={currentSeason()} />
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-lg"
          style={{ backgroundColor: teamInfo.primaryColor }}
        />
        <div>
          {/* 日本語名主・英語名従（plan §13-1 段階4。選手ページの h1 と同型） */}
          <h1 className="text-3xl font-bold tracking-tight">{teamNameJa(abbr) ?? teamInfo.name}</h1>
          {teamNameJa(abbr) && <p className="text-sm text-muted-foreground">{teamInfo.name}</p>}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{teamInfo.conference}ern Conference</span>
            <span>·</span>
            <span>{teamInfo.division} Division</span>
            {standing && (
              <>
                <span>·</span>
                <Badge variant="outline">
                  {standing.wins}-{standing.losses}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {teamSeries.length > 0 ? (
        <Tabs defaultValue="rs" className="gap-6">
          <PhaseTabsList />
          <TabsContent value="rs">{regularSeason}</TabsContent>
          <TabsContent value="po">{playoffSection}</TabsContent>
        </Tabs>
      ) : (
        regularSeason
      )}
    </div>
  );
}
