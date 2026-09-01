import type { Phase } from "@/lib/data/csv-utils";

export type { Phase };

// ?phase= の値をフェーズに解決する。既定は常にRS。POデータが無いシーズンでは "po" 指定も RS に落とす
export function resolvePhase(param: string | undefined, poAvailable: boolean): Phase {
  return param === "po" && poAvailable ? "po" : "rs";
}

export const PHASE_LABEL: Record<Phase, string> = { rs: "Regular Season", po: "Playoffs" };
