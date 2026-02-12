/**
 * @module StatusBadge
 * @description Color-coded status badge for entry statuses.
 * DRAFT=gray, SUBMITTED=amber, SIGNED=green, REJECTED=red, NEEDS_REVISION=orange.
 *
 * @see copilot-instructions.md — Section 11
 */

import { Badge } from "@/components/ui/badge";
import { ENTRY_STATUS_COLORS } from "@/lib/constants";
import { type StatusBadgeProps } from "@/types";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SIGNED: "Signed",
  REJECTED: "Rejected",
  NEEDS_REVISION: "Needs Revision",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colorClasses = ENTRY_STATUS_COLORS[status] ?? ENTRY_STATUS_COLORS.DRAFT;
  const label = statusLabels[status] ?? status;

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClasses,
        size === "sm" && "text-[10px] px-1.5 py-0",
        size === "md" && "text-xs px-2 py-0.5",
        size === "lg" && "text-sm px-3 py-1",
      )}
    >
      {label}
    </Badge>
  );
}
