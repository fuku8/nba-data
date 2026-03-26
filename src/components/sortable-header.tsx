"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SortConfig } from "@/lib/types";

export function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = sortConfig.key === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
