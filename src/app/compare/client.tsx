"use client";

import { PhaseSwitch } from "@/components/phase-switch";
import type { Phase } from "@/lib/phase";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getTeamColor } from "@/lib/constants/teams";
import { normalizeName } from "@/lib/utils";
import { ScoringWaffle } from "@/components/scoring-waffle";
import { CompareStatsTable, type CompareStatRow } from "@/components/compare-stats-table";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SeasonTitle } from "@/components/season-title";

// 同時比較できる選手数の上限。変更する場合はここだけ直せばよい
const MAX_PLAYERS = 4;

// ?ids=203999,1628983 → 初期選択（存在する選手のみ・重複除去・上限MAX_PLAYERS）
function parseIds(raw: string | null, players: ComparePlayer[]): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((id, i, arr) => !isNaN(id) && arr.indexOf(id) === i && players.some((p) => p.playerId === id))
    .slice(0, MAX_PLAYERS);
}

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];

export interface ComparePlayer {
  playerId: number;
  player: string;
  // 検索照合用の日本語名（対応表に無い選手は null。表示には使わない）
  playerJa: string | null;
  team: string;
  gp: number;
  mpg: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  fgPct: number;
  threePtPct: number;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  tsPct: number | null;
  pie: number | null;
  pts3: number;
  pts2: number;
  ptsFt: number;
  // ハッスル・運動量（第2レーダー用・リーグ最大値比で0-1に正規化済み）。データ欠損選手はnull
  hustle2: {
    screenAssists: number;
    deflections: number;
    looseBalls: number;
    boxOuts: number;
    distPerGame: number;
    avgSpeed: number;
  } | null;
}

// 凡例を選択順・縦1列で描画（rechartsの並びに依存しない）
const legendContent = (items: { name: string; color: string }[]) =>
  function LegendList() {
    return (
      <ul className="flex flex-col items-center gap-1 text-sm" style={{ paddingTop: 36 }}>
        {items.map((it) => (
          <li key={it.name} className="flex items-center gap-1.5" style={{ color: it.color }}>
            <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ backgroundColor: it.color }} />
            {it.name}
          </li>
        ))}
      </ul>
    );
  };

const HUSTLE_AXES: { key: keyof NonNullable<ComparePlayer["hustle2"]>; label: string }[] = [
  { key: "screenAssists", label: "スクリーンAST" },
  { key: "deflections", label: "ディフレクション" },
  { key: "looseBalls", label: "ルーズボール" },
  { key: "boxOuts", label: "ボックスアウト" },
  { key: "distPerGame", label: "走行距離" },
  { key: "avgSpeed", label: "平均スピード" },
];

// 初期表示が空にならないための固定プリセット（plan §13-2-1）。両選手がデータに居る組だけ表示する
const PRESETS: { label: string; ids: number[] }[] = [
  { label: "ヨキッチ vs SGA", ids: [203999, 1628983] },
  { label: "ドンチッチ vs エドワーズ", ids: [1629029, 1630162] },
  { label: "ウェンバンヤマ vs ヤニス", ids: [1641705, 203507] },
  { label: "カリー vs ブランソン", ids: [201939, 1628973] },
];

export function CompareClient({ players, phase, season, poAvailable }: { players: ComparePlayer[]; phase: Phase; season: string; poAvailable: boolean }) {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<number[]>(() => parseIds(searchParams.get("ids"), players));
  const [search, setSearch] = useState("");

  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    const q = normalizeName(search);
    return players
      .filter(
        (p) =>
          (normalizeName(p.player).includes(q) || (p.playerJa != null && normalizeName(p.playerJa).includes(q))) &&
          !selectedIds.includes(p.playerId)
      )
      .slice(0, 8);
  }, [search, players, selectedIds]);

  const selectedPlayers = selectedIds
    .map((id) => players.find((p) => p.playerId === id))
    .filter((p): p is ComparePlayer => p != null);

  const addPlayer = (id: number) => {
    if (selectedIds.length < MAX_PLAYERS && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setSearch("");
    }
  };

  const removePlayer = (id: number) => {
    setSelectedIds(selectedIds.filter((n) => n !== id));
  };

  // メインレーダー: PTS/REB/AST/STL/BLKをリーグ最大値比（%）で正規化
  const maxPts = Math.max(...players.map((p) => p.pts), 1);
  const maxReb = Math.max(...players.map((p) => p.trb), 1);
  const maxAst = Math.max(...players.map((p) => p.ast), 1);
  const maxStl = Math.max(...players.map((p) => p.stl), 1);
  const maxBlk = Math.max(...players.map((p) => p.blk), 1);

  const radarData = [
    { stat: "PTS", ...Object.fromEntries(selectedPlayers.map((p) => [p.playerId, (p.pts / maxPts) * 100])) },
    { stat: "REB", ...Object.fromEntries(selectedPlayers.map((p) => [p.playerId, (p.trb / maxReb) * 100])) },
    { stat: "AST", ...Object.fromEntries(selectedPlayers.map((p) => [p.playerId, (p.ast / maxAst) * 100])) },
    { stat: "STL", ...Object.fromEntries(selectedPlayers.map((p) => [p.playerId, (p.stl / maxStl) * 100])) },
    { stat: "BLK", ...Object.fromEntries(selectedPlayers.map((p) => [p.playerId, (p.blk / maxBlk) * 100])) },
  ];

  // 第2レーダー: ハッスル・運動量。データ欠損選手はこのレーダーからのみ除外する
  const hustleEligible = selectedPlayers.filter((p) => p.hustle2 != null);
  const hustleMissing = selectedPlayers.filter((p) => p.hustle2 == null);
  const radarData2 = HUSTLE_AXES.map(({ key, label }) => ({
    stat: label,
    ...Object.fromEntries(hustleEligible.map((p) => [p.playerId, p.hustle2![key] * 100])),
  }));

  // value は優劣・差分判定用の生値（表示と同じスケール。%系は×100）。better未指定=向きなし。DRtgのみ低いほど良い
  const statRows: CompareStatRow<ComparePlayer>[] = [
    { label: "PTS", get: (p) => p.pts.toFixed(1), value: (p) => p.pts, better: "high", digits: 1 },
    { label: "REB", get: (p) => p.trb.toFixed(1), value: (p) => p.trb, better: "high", digits: 1 },
    { label: "AST", get: (p) => p.ast.toFixed(1), value: (p) => p.ast, better: "high", digits: 1 },
    { label: "STL", get: (p) => p.stl.toFixed(1), value: (p) => p.stl, better: "high", digits: 1 },
    { label: "BLK", get: (p) => p.blk.toFixed(1), value: (p) => p.blk, better: "high", digits: 1 },
    { label: "FG%", get: (p) => (p.fgPct ? (p.fgPct * 100).toFixed(1) + "%" : "-"), value: (p) => (p.fgPct ? p.fgPct * 100 : null), better: "high", digits: 1 },
    { label: "3P%", get: (p) => (p.threePtPct ? (p.threePtPct * 100).toFixed(1) + "%" : "-"), value: (p) => (p.threePtPct ? p.threePtPct * 100 : null), better: "high", digits: 1 },
    { label: "MPG", get: (p) => p.mpg.toFixed(1), value: (p) => p.mpg, digits: 1 },
    { label: "GP", get: (p) => String(p.gp), value: (p) => p.gp, digits: 0 },
    { label: "ORtg", get: (p) => p.offRating?.toFixed(1) ?? "-", value: (p) => p.offRating, better: "high", digits: 1 },
    { label: "DRtg", get: (p) => p.defRating?.toFixed(1) ?? "-", value: (p) => p.defRating, better: "low", digits: 1 },
    { label: "NRtg", get: (p) => (p.netRating != null ? (p.netRating > 0 ? "+" : "") + p.netRating.toFixed(1) : "-"), value: (p) => p.netRating, better: "high", digits: 1 },
    { label: "TS%", get: (p) => (p.tsPct != null ? (p.tsPct * 100).toFixed(1) + "%" : "-"), value: (p) => (p.tsPct != null ? p.tsPct * 100 : null), better: "high", digits: 1 },
    { label: "PIE", get: (p) => (p.pie != null ? (p.pie * 100).toFixed(1) + "%" : "-"), value: (p) => (p.pie != null ? p.pie * 100 : null), better: "high", digits: 1 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SeasonTitle season={season} phase={phase} />
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">選手比較</h1>
          <PhaseSwitch phase={phase} poAvailable={poAvailable} basePath="/compare" params={{ ids: selectedIds.length > 0 ? selectedIds.join(",") : undefined }} />
        </div>
      </div>
      <p className="text-muted-foreground mt-1">
        選手を追加すると比較表・レーダーチャート・得点の作り方が表示されます（1名から可、最大{MAX_PLAYERS}名で比較）。
      </p>

      {/* Search + Selected */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Input
            placeholder={`選手名を入力（最大${MAX_PLAYERS}人）...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={selectedIds.length >= MAX_PLAYERS}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
              {suggestions.map((p) => (
                <button
                  key={p.playerId}
                  onClick={() => addPlayer(p.playerId)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                >
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getTeamColor(p.team) }} />
                  {p.player}
                  <span className="text-muted-foreground">({p.team})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedPlayers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              すべてクリア
            </Button>
          )}
          {selectedPlayers.map((p, i) => (
            <Badge
              key={p.playerId}
              variant="secondary"
              className="text-sm py-1 px-3 gap-1.5"
              style={{ borderLeft: `3px solid ${COLORS[i]}` }}
            >
              {p.player} ({p.team})
              <button onClick={() => removePlayer(p.playerId)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {selectedPlayers.length === 0 && (
        <div className="py-8 text-center space-y-4">
          <p className="text-muted-foreground">上の検索バーから選手を追加してください（最大{MAX_PLAYERS}人）</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.filter((pr) => pr.ids.every((id) => players.some((p) => p.playerId === id))).map((pr) => (
              <Button key={pr.label} variant="outline" size="sm" onClick={() => setSelectedIds(pr.ids)}>
                {pr.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>比較表</CardTitle>
          </CardHeader>
          <CardContent>
            <CompareStatsTable rows={statRows} players={selectedPlayers} colors={COLORS} onRemove={removePlayer} />
          </CardContent>
        </Card>
      )}

      {selectedPlayers.length > 0 && (
        <>
          {/* PCではレーダー2枚を横並び */}
          <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>スタッツ比較</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={480}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="stat" />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  {selectedPlayers.map((p, i) => (
                    <Radar
                      key={p.playerId}
                      name={p.player}
                      dataKey={p.playerId}
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      fill={COLORS[i]}
                      fillOpacity={0.12}
                    />
                  ))}
                  <Legend
                    verticalAlign="bottom"
                    content={legendContent(selectedPlayers.map((p, i) => ({ name: p.player, color: COLORS[i] })))}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ハッスル・運動量比較</CardTitle>
              <p className="text-xs text-muted-foreground">
                スクリーンAST/ディフレクション/ルーズボール/ボックスアウト/走行距離/平均スピードのリーグ最大値比（%）
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {hustleEligible.length > 0 ? (
                <ResponsiveContainer width="100%" height={480}>
                  <RadarChart data={radarData2} outerRadius="72%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stat" />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    {hustleEligible.map((p) => {
                      const i = selectedPlayers.indexOf(p);
                      return (
                        <Radar
                          key={p.playerId}
                          name={p.player}
                          dataKey={p.playerId}
                          stroke={COLORS[i]}
                          strokeWidth={2}
                          fill={COLORS[i]}
                          fillOpacity={0.12}
                        />
                      );
                    })}
                    <Legend
                      verticalAlign="bottom"
                      content={legendContent(hustleEligible.map((p) => ({ name: p.player, color: COLORS[selectedPlayers.indexOf(p)] })))}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-4">ハッスルデータのある選手がいません</p>
              )}
              {hustleMissing.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {hustleMissing.map((p) => p.player).join("、")}はハッスルデータ対象外
                </p>
              )}
            </CardContent>
          </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>得点の作り方</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {selectedPlayers.map((p, i) => (
                  <div key={p.playerId} className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                      {p.player}
                    </div>
                    <ScoringWaffle pts3={p.pts3} pts2={p.pts2} ptsFt={p.ptsFt} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
