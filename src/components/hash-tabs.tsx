"use client";

import { useState, useSyncExternalStore } from "react";
import { Tabs } from "@/components/ui/tabs";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => decodeURIComponent(window.location.hash.slice(1));

// URL の #<値> に一致するタブを開いた状態で始める Tabs。過去季のページから選手ページへ来たとき
// （/players/<id>#2025-26）に、その季のタブを開くために使う。一致しなければ defaultValue。
// 静的 HTML は defaultValue で書き出され、ハッシュはブラウザ側だけが読む
export function HashTabs({
  values,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<typeof Tabs>, "value" | "onValueChange" | "defaultValue"> & { values: string[]; defaultValue: string }) {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  // タブを押した後は、押したタブが勝つ
  const [picked, setPicked] = useState<string | null>(null);
  return <Tabs value={picked ?? (values.includes(hash) ? hash : defaultValue)} onValueChange={(v) => setPicked(v)} {...props} />;
}
