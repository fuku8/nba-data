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
// ヘッダー（navigation.tsx）とフッター（layout.tsx）の両方で使う。
// "use client" のモジュールに置くとサーバー側の layout から値として読めないため、ここに分離
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
