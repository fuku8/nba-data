// 熱戦指数(leadChanges + timesTied − 点差)を🔥の数に変換。
// 算出は src/lib/data/games.ts の getDramaScores（サーバー専用）、表示はクライアント・サーバー両方で使う
export function dramaFlames(drama: number | undefined): string {
  if (drama == null) return "";
  if (drama >= 20) return "🔥🔥🔥";
  if (drama >= 10) return "🔥🔥";
  if (drama >= 4) return "🔥";
  return "";
}
