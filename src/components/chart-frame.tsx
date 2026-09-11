"use client";

import { useRef, type ReactNode } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTeamColor } from "@/lib/constants/teams";
import { SegmentedName } from "@/components/segmented-name";

// metadata.ts の SITE_NAME / SITE_URL と揃える（あちらは lib/season 経由で fs に依存し client から import できない）
const SITE_NAME = "スタッツのかたち";
const SITE_HOST = "number-shape.com";

// 図表の拡大表示＋1枚PNG保存（plan §13-4 B。Baseball Savant の Save as Image と同型）。
// 図をクリックで <dialog> に拡大し、ヘッダー（名前・チーム・図タイトル）とフッター（サイト名・出典）ごと
// html-to-image で1枚に焼き込む。表示している DOM をそのまま撮るので、画面と保存画像が必ず一致する。
// children は在ページ表示と dialog 内の2回レンダーされる（同じ ReactNode の複数箇所レンダーは合法）
export function ChartFrame({
  title,
  context,
  name,
  team,
  asOf,
  children,
}: {
  title: string; // 図表タイトル（例: League Percentile）
  context: string; // 季・フェーズ行（例: Regular Season 2025-26）
  name?: string; // 選手名・チーム名（日本語）。無い図はタイトルのみのヘッダーになる
  team?: string; // チーム略称（バッジとカラー縦線）
  asOf?: string; // データ反映日（現行シーズンのみ渡す）
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  // PNG はモーダルを開いた時点で裏で生成し始める。iOS Safari はタップから時間が経った
  // ダウンロード/共有をエラー表示なしで無視するため、保存タップ時には生成済みにしておく
  const pngPromise = useRef<Promise<Blob | null> | null>(null);

  const makePng = async () => {
    const node = captureRef.current;
    if (!node) return null;
    // 保存時だけ読む（初期バンドルに入れない）
    const { toBlob } = await import("html-to-image");
    return toBlob(node, { pixelRatio: 2 });
  };

  const open = () => {
    dialogRef.current?.showModal();
    // 比較ページ等で内容が変わっている可能性があるので、開くたびに作り直す
    pngPromise.current = null;
    requestAnimationFrame(() => {
      pngPromise.current = makePng();
    });
  };

  const save = async () => {
    const blob = await (pngPromise.current ??= makePng());
    if (!blob) return;
    const filename = `${name ? `${name}-` : ""}${title}.png`;
    // スマホは共有シート（「画像を保存」で写真アプリへ・X/LINE へ直接）。
    // <a download> は iOS Safari で静かに失敗するため使わない。PC は従来どおりダウンロード
    const file = new File([blob], filename, { type: "image/png" });
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        // ユーザーのキャンセルは何もしない。共有機構自体の失敗だけダウンロードへフォールバック
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <>
      {/* 開くのは全図とも図の下の明示ボタン。図全面クリック方式は廃止した
          （マップ・レーダーはホバー等の既存操作とぶつかり、スマホはホバーが無く保存できることに気づけないため） */}
      <div>
        {children}
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Download className="h-3.5 w-3.5" />
            画像保存
          </button>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[calc(100vw-2rem)] max-w-3xl bg-transparent p-0 backdrop:bg-black/70"
      >
        <div ref={captureRef} className="rounded-xl border bg-background text-foreground">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            {team && <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: getTeamColor(team) }} />}
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold leading-snug">
                <SegmentedName
                  name={name ?? title}
                  suffix={
                    team && (
                      <Badge variant="outline" className="ml-2 align-middle text-xs" style={{ borderColor: getTeamColor(team) }}>
                        {team}
                      </Badge>
                    )
                  }
                />
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {name ? `${title} · ` : ""}
                {context}
              </div>
            </div>
            <img src="/logo-ns-mark.svg" alt={SITE_NAME} className="h-8 w-auto shrink-0" />
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-5 py-3 text-xs text-muted-foreground">
            <span>{SITE_NAME} · {SITE_HOST}</span>
            <span>
              {asOf ? `データ反映 ${asOf} · ` : ""}出典 NBA.com/Stats
            </span>
          </div>
        </div>
        {/* pb-1: iOS のフォーカスリングがダイアログ下端で切れないための余白。
            focus-visible 指定はタップ後に付く青い既定アウトラインをサイト共通のリングに置き換える */}
        <div className="mt-3 flex justify-end gap-2 pb-1">
          <button
            type="button"
            onClick={save}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            画像を保存
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}
