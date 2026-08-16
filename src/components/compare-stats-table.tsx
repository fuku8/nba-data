// 比較表: 列ごとの最良値ハイライト＋2人選択時の差分行つき。
// RS版(/compare)とPO版(/playoffs/compare)の両clientから使う共通コンポーネント
// （親がclientなので"use client"指定は不要。onRemove経由でしかイベントを受けない）
import Link from "next/link";
import { X } from "lucide-react";
import { bestIndexes, diffFavors, formatDiff, type Better } from "@/lib/compare-diff";

export type CompareStatRow<P> = {
  label: string;
  get: (p: P) => string; // 表示文字列（従来どおり）
  value: (p: P) => number | null; // 優劣・差分用の生値。表示と同じスケールにする（%系は×100済みの値）
  better?: Better; // 未指定=向きなし（GP/MPGなど。ハイライト・差分色付けの対象外）
  digits: number; // 差分行の小数桁
};

const BEST_COLOR = "#10b981"; // その項目で最も良い値

// 表示桁で丸めてから優劣・差分を判定する（表示上同値なのに色が付く矛盾の防止）
function rounded<P>(row: CompareStatRow<P>, p: P): number | null {
  const x = row.value(p);
  return x === null ? null : Number(x.toFixed(row.digits));
}

export function CompareStatsTable<P extends { playerId: number; player: string }>({
  rows,
  players,
  colors,
  onRemove,
}: {
  rows: CompareStatRow<P>[];
  players: P[];
  colors: string[]; // 選択順の選手色
  onRemove?: (id: number) => void;
}) {
  // 列ごとに「最も良い値」の行インデックス集合（向きのある列のみ・2人以上のとき）
  const best = new Map<string, Set<number>>();
  if (players.length >= 2) {
    for (const row of rows) {
      if (!row.better) continue;
      best.set(row.label, new Set(bestIndexes(players.map((p) => rounded(row, p)), row.better)));
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3">選手</th>
            {rows.map((row) => (
              <th key={row.label} className="text-right py-2 px-3 whitespace-nowrap">
                {row.label}
              </th>
            ))}
            {onRemove && <th className="py-2 px-3" />}
          </tr>
        </thead>
        <tbody>
          {players.map((p, j) => (
            <tr key={p.playerId} className="border-b hover:bg-accent/30">
              <td className="py-2 px-3 font-medium whitespace-nowrap">
                <Link href={`/players/${p.playerId}`} className="flex items-center gap-2 hover:underline">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[j] }} />
                  {p.player}
                </Link>
              </td>
              {rows.map((row) => (
                <td
                  key={row.label}
                  className="text-right py-2 px-3 font-mono"
                  style={best.get(row.label)?.has(j) ? { fontWeight: 700, color: BEST_COLOR } : undefined}
                >
                  {row.get(p)}
                </td>
              ))}
              {onRemove && (
                <td className="py-2 px-3">
                  <button onClick={() => onRemove(p.playerId)}>
                    <X className="h-3 w-3" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {players.length === 2 && (
            <tr className="border-b">
              <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">差（上段−下段）</td>
              {rows.map((row) => {
                const a = rounded(row, players[0]);
                const b = rounded(row, players[1]);
                const favors = row.better ? diffFavors(a, b, row.better) : null;
                return (
                  <td
                    key={row.label}
                    className={`text-right py-2 px-3 font-mono text-xs ${favors === null ? "text-muted-foreground" : ""}`}
                    style={favors === null ? undefined : { color: colors[favors] }}
                  >
                    {formatDiff(a, b, row.digits)}
                  </td>
                );
              })}
              {onRemove && <td />}
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        緑の太字はその項目で最も良い値（2人以上のとき。GP・MPGは向きがないため対象外、DRtgは低いほど良い向きで判定）。
        2人比較のときは最下行に差を表示し、色は有利な側の選手色。
      </p>
    </div>
  );
}
