import type { Phase } from "@/lib/data/csv-utils";

export type { Phase };

export const PHASE_LABEL: Record<Phase, string> = { rs: "Regular Season", po: "Playoffs" };

// フェーズはURLのパス区分で持つ（静的エクスポートのためクエリは使わない・plan.md §12-11）: /players と /players/po
export const phasePath = (basePath: string, phase: Phase) => (phase === "po" ? `${basePath}/po` : basePath);
