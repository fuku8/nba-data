import { permanentRedirect } from "next/navigation";

// 旧URL。RS/PO統合（plan.md §12-2）で /players?phase=po に移動
export default function LegacyPlayoffPage() {
  permanentRedirect("/players?phase=po");
}
