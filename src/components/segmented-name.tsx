// 選手名を「・」「＝」の直後でだけ折り返す（姓・名の途中で切らない。nba.com の姓名改行と同型）。
// 区切りごとに whitespace-nowrap の span で包むと、改行機会が span の境界だけになる。
// 区切りの無い名前（英語名など）はそのまま返し、通常の折り返しに任せる
export function SegmentedName({ name }: { name: string }) {
  const parts = name.split(/(?<=[・＝])/);
  if (parts.length <= 1) return <>{name}</>;
  return (
    <>
      {parts.map((s, i) => (
        <span key={i} className="whitespace-nowrap">
          {s}
        </span>
      ))}
    </>
  );
}
