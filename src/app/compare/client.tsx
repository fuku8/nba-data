"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { getTeamColor } from "@/lib/constants/teams";
import { ScoringWaffle } from "@/components/scoring-waffle";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 同時比較できる選手数の上限。変更する場合はここだけ直せばよい
const MAX_PLAYERS = 4;

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];

export interface ComparePlayer {
  playerId: number;
  player: string;
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

// ダイアクリティカルマーク除去（Jokić を "jokic" で検索可能に）
const normalizeName = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const HUSTLE_AXES: { key: keyof NonNullable<ComparePlayer["hustle2"]>; label: string }[] = [
  { key: "screenAssists", label: "スクリーンAST" },
  { key: "deflections", label: "ディフレクション" },
  { key: "looseBalls", label: "ルーズボール" },
  { key: "boxOuts", label: "ボックスアウト" },
  { key: "distPerGame", label: "走行距離" },
  { key: "avgSpeed", label: "平均スピード" },
];

export function CompareClient({ players }: { players: ComparePlayer[] }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    const q = normalizeName(search);
    return players
      .filter((p) => normalizeName(p.player).includes(q) && !selectedIds.includes(p.playerId))
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

  const statRows: { label: string; get: (p: ComparePlayer) => string }[] = [
    { label: "PTS", get: (p) => p.pts.toFixed(1) },
    { label: "REB", get: (p) => p.trb.toFixed(1) },
    { label: "AST", get: (p) => p.ast.toFixed(1) },
    { label: "STL", get: (p) => p.stl.toFixed(1) },
    { label: "BLK", get: (p) => p.blk.toFixed(1) },
    { label: "FG%", get: (p) => (p.fgPct ? (p.fgPct * 100).toFixed(1) + "%" : "-") },
    { label: "3P%", get: (p) => (p.threePtPct ? (p.threePtPct * 100).toFixed(1) + "%" : "-") },
    { label: "MPG", get: (p) => p.mpg.toFixed(1) },
    { label: "GP", get: (p) => String(p.gp) },
    { label: "ORtg", get: (p) => p.offRating?.toFixed(1) ?? "-" },
    { label: "DRtg", get: (p) => p.defRating?.toFixed(1) ?? "-" },
    { label: "NRtg", get: (p) => (p.netRating != null ? (p.netRating > 0 ? "+" : "") + p.netRating.toFixed(1) : "-") },
    { label: "TS%", get: (p) => (p.tsPct != null ? (p.tsPct * 100).toFixed(1) + "%" : "-") },
    { label: "PIE", get: (p) => (p.pie != null ? (p.pie * 100).toFixed(1) + "%" : "-") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">検索</h1>
      <p className="text-muted-foreground mt-1">
        選手を追加すると比較表が表示されます（1名から可）。2名以上でレーダーチャートと得点の作り方も表示されます。
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

        <div className="flex flex-wrap gap-2">
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
        <p className="text-center text-muted-foreground py-8">
          上の検索バーから選手を追加してください（最大{MAX_PLAYERS}人）
        </p>
      )}

      {selectedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>比較表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">選手</th>
                    {statRows.map((row) => (
                      <th key={row.label} className="text-right py-2 px-3 whitespace-nowrap">
                        {row.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayers.map((p, i) => (
                    <tr key={p.playerId} className="border-b hover:bg-accent/30">
                      <td className="py-2 px-3 font-medium whitespace-nowrap">
                        <Link href={`/players/${p.playerId}`} className="flex items-center gap-2 hover:underline">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                          {p.player}
                        </Link>
                      </td>
                      {statRows.map((row) => (
                        <td key={row.label} className="text-right py-2 px-3 font-mono">
                          {row.get(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlayers.length >= 2 && (
        <>
          {/* PCではレーダー2枚を横並び */}
          <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>スタッツ比較</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={460}>
                <RadarChart data={radarData}>
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
                  <Legend layout="vertical" verticalAlign="bottom" align="center" />
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
                <ResponsiveContainer width="100%" height={460}>
                  <RadarChart data={radarData2}>
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
                    <Legend layout="vertical" verticalAlign="bottom" align="center" />
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
