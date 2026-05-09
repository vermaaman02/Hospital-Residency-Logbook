/**
 * @module RevisionThreadButton
 * @description Drop-in "History" button that opens a dialog containing the
 * RevisionThread for a given entry. Use anywhere a logbook row is rendered.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { History } from "lucide-react";
import { RevisionThread } from "./RevisionThread";

interface RevisionThreadButtonProps {
	entityType: string;
	entityId: string;
	/** Title shown at the top of the dialog. Defaults to "Revision History". */
	title?: string;
	/** Subtitle / context line under the title. */
	description?: string;
	/** Hide certain snapshot fields from the diff view. */
	hideFields?: string[];
	/** Visual variant of the trigger button. */
	variant?: "outline" | "ghost" | "secondary";
	size?: "sm" | "default";
	className?: string;
	label?: string;
}

export function RevisionThreadButton({
	entityType,
	entityId,
	title = "Revision History",
	description,
	hideFields,
	variant = "outline",
	size = "sm",
	className,
	label = "History",
}: RevisionThreadButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				className={className ?? "h-7 text-xs gap-1"}
				onClick={() => setOpen(true)}
			>
				<History className="h-3 w-3" />
				{label}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<History className="h-5 w-5" />
							{title}
						</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					{open && (
						<RevisionThread
							entityType={entityType}
							entityId={entityId}
							hideFields={hideFields}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
