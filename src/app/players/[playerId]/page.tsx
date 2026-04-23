import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlayerPerGame, getPlayerAdvanced, getPlayerProfile } from "@/lib/data/players";
import { getPlayoffPlayerPerGame } from "@/lib/data/playoffs";
import { getTeamColor, getTeamInfo } from "@/lib/constants/teams";

export const revalidate = 3600;

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const playerIdNum = parseInt(playerId, 10);

  const allPerGame = getPlayerPerGame();
  const allAdvanced = getPlayerAdvanced();
  const allPoPerGame = getPlayoffPlayerPerGame();
  const profile = getPlayerProfile(playerIdNum);

  const pg = allPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPerGame.find((p) => p.playerId === playerIdNum);
  const adv = allAdvanced.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allAdvanced.find((p) => p.playerId === playerIdNum);
  const poPg = allPoPerGame.find((p) => p.playerId === playerIdNum && p.team !== "TOT")
    || allPoPerGame.find((p) => p.playerId === playerIdNum);

  if (!pg) notFound();

  const teamInfo = getTeamInfo(pg.team);

  const fmtPct = (v: number | undefined | null) => (v != null && v !== 0) ? (v * 100).toFixed(1) + "%" : "-";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: getTeamColor(pg.team) }}
        >
          {pg.player.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pg.player}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link href={`/teams/${pg.team}`} className="hover:underline flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getTeamColor(pg.team) }} />
              {teamInfo?.name ?? pg.team}
            </Link>
            <span>·</span>
            <span>Age {pg.age}</span>
          </div>
          {profile && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              {[
                profile.jersey ? `#${profile.jersey}` : null,
                profile.position ? profile.position.split("-")[0] : null,
                profile.height ? profile.height : null,
                profile.weight ? `${profile.weight} lbs` : null,
                profile.birthdate ? profile.birthdate : null,
                profile.fromYear ? `NBA ${profile.fromYear}年〜` : null,
              ]
                .filter(Boolean)
                .map((item, idx, arr) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    {item}
                    {idx < arr.length - 1 && <span>·</span>}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Stats</CardTitle>
            {poPg && <Badge className="bg-orange-500 text-white border-0 text-xs">Playoffs</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-32">シーズン</th>
                  {["GP", "PTS", "REB", "AST", "STL", "BLK", "TOV", "FG%", "3P%", "FT%", "MIN"].map((h) => (
                    <th key={h} className="py-2 px-3 text-center font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {poPg && (
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-semibold text-orange-400">Playoffs</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.gp}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{poPg.pts.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.trb.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.ast.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.stl.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.blk.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.tov.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.fgPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.threePtPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{fmtPct(poPg.ftPct)}</td>
                    <td className="py-2 px-3 text-center font-mono">{poPg.mpg.toFixed(1)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted-foreground">Regular Season</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.gp}</td>
                  <td className="py-2 px-3 text-center font-mono font-semibold">{pg.pts.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.trb.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.ast.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.stl.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.blk.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.tov.toFixed(1)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.fgPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.threePtPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{fmtPct(pg.ftPct)}</td>
                  <td className="py-2 px-3 text-center font-mono">{pg.mpg.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Stats */}
      {adv && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
              {[
                { label: "ORtg", value: adv.offRating.toFixed(1) },
                { label: "DRtg", value: adv.defRating.toFixed(1) },
                { label: "NRtg", value: (adv.netRating > 0 ? "+" : "") + adv.netRating.toFixed(1) },
                { label: "TS%", value: (adv.tsPct * 100).toFixed(1) + "%" },
                { label: "eFG%", value: (adv.efgPct * 100).toFixed(1) + "%" },
                { label: "USG%", value: (adv.usgPct * 100).toFixed(1) + "%" },
                { label: "AST%", value: (adv.astPct * 100).toFixed(1) + "%" },
                { label: "REB%", value: (adv.rebPct * 100).toFixed(1) + "%" },
                { label: "PIE", value: (adv.pie * 100).toFixed(1) + "%" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-lg font-mono font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
