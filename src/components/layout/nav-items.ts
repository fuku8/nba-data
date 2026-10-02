import {
  Trophy,
  Users,
  BarChart3,
  Search,
  Calendar,
  Medal,
  ListOrdered,
  BookOpen,
  Shapes,
} from "lucide-react";

// 単一ナビ。RS/POは「モード」ではなく各ページ内の /po パス切替と文脈バッジで示す（plan.md §12-2）
// ヘッダーとフッター（どちらも navigation.tsx）で使う
export const navItems = [
  { href: "/standings", label: "順位表", icon: ListOrdered },
  { href: "/teams", label: "チーム", icon: BarChart3 },
  { href: "/players", label: "選手", icon: Users },
  { href: "/leaders", label: "リーダーズ", icon: Medal },
  { href: "/compare", label: "比較", icon: Search },
  { href: "/games", label: "試合", icon: Calendar },
  { href: "/playoffs", label: "プレーオフ", icon: Trophy },
  { href: "/types", label: "タイプ", icon: Shapes },
  { href: "/metrics", label: "指標解説", icon: BookOpen },
];

// 過去季に残すページ（plan.md §13-10・2026-10-02 決定）。過去季を見ている間、ナビはこの3つだけを季つきの URL で出し、
// 別のページへ移っても季が保たれるようにする。match は「いまこの項目に居るか」の判定に使う季なしのパス
const ARCHIVE_PATHS = ["/standings", "/leaders", "/playoffs"];
export const navItemsFor = (pastSeason?: string) =>
  pastSeason
    ? navItems.filter((i) => ARCHIVE_PATHS.includes(i.href)).map((i) => ({ ...i, match: i.href, href: `${i.href}/${pastSeason}` }))
    : navItems.map((i) => ({ ...i, match: i.href }));
