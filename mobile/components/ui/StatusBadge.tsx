/**
 * <StatusBadge /> — Maps `EntryStatus` to a Badge with the correct tone
 * + icon. Use everywhere we display an entry's lifecycle state.
 *
 *   <StatusBadge status="SIGNED" />
 */

import React from "react";
import { Check, FileEdit, FilePen, X, RefreshCw } from "lucide-react-native";
import { Badge } from "./Badge";

// Mirrors prisma EntryStatus + Mobile-app-roadmap §4
export type EntryStatus =
	| "DRAFT"
	| "SUBMITTED"
	| "SIGNED"
	| "REJECTED"
	| "NEEDS_REVISION";

const CONFIG: Record<
	EntryStatus,
	{ label: string; tone: React.ComponentProps<typeof Badge>["tone"]; icon: React.ReactNode }
> = {
	DRAFT: { label: "Draft", tone: "draft", icon: <FileEdit size={12} strokeWidth={2.5} /> },
	SUBMITTED: { label: "Submitted", tone: "submitted", icon: <FilePen size={12} strokeWidth={2.5} /> },
	SIGNED: { label: "Signed", tone: "signed", icon: <Check size={12} strokeWidth={2.5} /> },
	REJECTED: { label: "Rejected", tone: "rejected", icon: <X size={12} strokeWidth={2.5} /> },
	NEEDS_REVISION: {
		label: "Needs Revision",
		tone: "needsRevision",
		icon: <RefreshCw size={12} strokeWidth={2.5} />,
	},
};

export function StatusBadge({ status }: { status: EntryStatus }) {
	const c = CONFIG[status];
	return <Badge label={c.label} tone={c.tone} icon={c.icon} />;
}
