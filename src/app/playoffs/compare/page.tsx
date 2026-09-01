import { permanentRedirect } from "next/navigation";

// 旧URL。RS/PO統合（plan.md §12-2）で /compare?phase=po に移動
export default function LegacyPlayoffPage() {
  permanentRedirect("/compare?phase=po");
}
