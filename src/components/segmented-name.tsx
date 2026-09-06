import type { ReactNode } from "react";

// 選手名を「・」「＝」の直後でだけ折り返す（姓・名の途中で切らない。nba.com の姓名改行と同型）。
// 区切りごとに whitespace-nowrap の span で包むと、改行機会が span の境界だけになる。
// 区切りの無い名前（英語名など）はそのまま返し、通常の折り返しに任せる。
// suffix（チームバッジ等）は最終セグメントと同じ nowrap に入れ、バッジだけが次行に落ちないようにする
export function SegmentedName({ name, suffix }: { name: string; suffix?: ReactNode }) {
  const parts = name.split(/(?<=[・＝])/);
  if (parts.length <= 1)
    return (
      <>
        {name}
        {suffix}
      </>
    );
  return (
    <>
      {parts.map((s, i) => (
        <span key={i} className="whitespace-nowrap">
          {s}
          {i === parts.length - 1 && suffix}
        </span>
      ))}
    </>
  );
}
