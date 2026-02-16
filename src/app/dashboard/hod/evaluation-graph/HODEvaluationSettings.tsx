/**
 * @module HODEvaluationSettings
 * @description Toggle component for HOD to enable/disable faculty access
 * to the Evaluation Graph feature.
 */

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toggleAutoReview } from "@/actions/auto-review";

interface HODEvaluationSettingsProps {
	facultyEnabled: boolean;
}

export function HODEvaluationSettings({
	facultyEnabled,
}: HODEvaluationSettingsProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [enabled, setEnabled] = useState(facultyEnabled);

	function handleToggle(checked: boolean) {
		setEnabled(checked);
		startTransition(async () => {
			try {
				await toggleAutoReview("evaluationGraphFacultyEnabled", checked);
				toast.success(
					checked ?
						"Faculty can now fill evaluation graphs"
					:	"Faculty access to evaluation graphs disabled",
				);
				router.refresh();
			} catch {
				setEnabled(!checked); // revert
				toast.error("Failed to update setting");
			}
		});
	}

	return (
		<Card className="border-hospital-primary/20 bg-hospital-primary/5">
			<CardContent className="p-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Users className="h-5 w-5 text-hospital-primary" />
						<div>
							<Label
								htmlFor="faculty-enabled-toggle"
								className="font-medium cursor-pointer"
							>
								Allow Faculty to Fill Evaluation Graphs
							</Label>
							<p className="text-sm text-muted-foreground mt-0.5">
								When disabled, only you (HOD) can create and edit evaluation
								entries.
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isPending && (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						)}
						<Switch
							id="faculty-enabled-toggle"
							checked={enabled}
							onCheckedChange={handleToggle}
							disabled={isPending}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
