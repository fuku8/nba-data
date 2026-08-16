// 比較表の優劣ハイライトと2人比較の差分行のための純ロジック。
// npb-data src/lib/compare-diff.ts からの移植（同一実装・テストも移植済み）。
// "use client" から import されるため node:fs 依存を持ち込まないこと

export type Better = "high" | "low";

// 「最も良い値」のインデックス集合を返す（同値タイは全員）。null は判定対象外。
// 有効値が1つ以下なら空配列（1人だけの表に優劣はない）
export function bestIndexes(values: (number | null)[], better: Better): number[] {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return [];
  const best = better === "high" ? Math.max(...valid) : Math.min(...valid);
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

// 2者の差 a − b を表示用に整形（digits は小数桁）。null が絡めば "-"
export function formatDiff(a: number | null, b: number | null, digits: number): string {
  if (a === null || b === null) return "-";
  const s = (a - b).toFixed(digits);
  if (Number(s) === 0) return `±${(0).toFixed(digits)}`;
  return a - b > 0 ? `+${s}` : s;
}

// 差が2者のどちらに有利か。0=前者、1=後者、null=同値または判定不能(null含む)
export function diffFavors(a: number | null, b: number | null, better: Better): 0 | 1 | null {
  if (a === null || b === null || a === b) return null;
  const aWins = better === "high" ? a > b : a < b;
  return aWins ? 0 : 1;
}
