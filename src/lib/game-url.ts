// NBA公式の試合詳細ページ（ボックススコアあり）URL。fs/path非依存なのでクライアントコンポーネントからも安全にimportできる
export function gameDetailUrl(gameId: string): string {
  return `https://www.nba.com/game/${gameId}`;
}
