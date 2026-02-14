/**
 * @module ClinicalSkillEditForm
 * @description Form for editing a single clinical skill entry.
 * Used for both Adult and Pediatric skills.
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { clinicalSkillFields } from "@/lib/constants/clinical-skills-fields";
import { clinicalSkillSchema } from "@/lib/validators/clinical-skills";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClinicalSkillEditFormProps {
	type: "adult" | "pediatric";
	entryId: string;
	initialData: {
		skillName: string;
		representativeDiagnosis: string | null;
		confidenceLevel: string | null;
		totalTimesPerformed: number;
	};
	onUpdateAction: (
		type: "adult" | "pediatric",
		id: string,
		data: Record<string, unknown>,
	) => Promise<{ success: boolean }>;
}

export function ClinicalSkillEditForm({
	type,
	entryId,
	initialData,
	onUpdateAction,
}: ClinicalSkillEditFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const defaultValues = {
		skillName: initialData.skillName,
		representativeDiagnosis: initialData.representativeDiagnosis ?? "",
		confidenceLevel: initialData.confidenceLevel ?? undefined,
		totalTimesPerformed: initialData.totalTimesPerformed,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		startTransition(async () => {
			try {
				await onUpdateAction(type, entryId, data);
				toast.success("Skill entry updated");
				router.push("/dashboard/student/clinical-skills");
				router.refresh();
			} catch {
				toast.error("Failed to update skill entry");
			} finally {
				setIsSubmitting(false);
			}
		});
	}

	if (isPending && isSubmitting) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<GenericLogForm
			schema={clinicalSkillSchema as never}
			defaultValues={defaultValues as never}
			fields={clinicalSkillFields}
			onSubmit={handleSubmit as never}
			title={`Edit: ${initialData.skillName}`}
			description={`Update diagnosis, confidence level, and tally for this ${type} clinical skill`}
		/>
	);
}
