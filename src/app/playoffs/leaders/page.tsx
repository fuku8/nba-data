import { permanentRedirect } from "next/navigation";

// 旧URL。RS/PO統合（plan.md §12-2）で /leaders?phase=po に移動
export default function LegacyPlayoffPage() {
  permanentRedirect("/leaders?phase=po");
}
