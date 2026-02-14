/**
 * @module DiagnosticSkillEntryForm
 * @description Reusable form for creating/editing diagnostic skill entries.
 * Works for all 3 categories (ABG, ECG, Other Diagnostic).
 * Skill names are pre-populated from the constants based on category.
 *
 * @see PG Logbook .md — "DIAGNOSTIC SKILL LOGS"
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { getDiagnosticSkillFields } from "@/lib/constants/diagnostic-skill-fields";
import { diagnosticSkillSchema } from "@/lib/validators/diagnostic-skills";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { type DiagnosticSkillConfig } from "@/lib/constants/diagnostic-types";

interface DiagnosticSkillEntryFormProps {
	categoryEnum: string;
	categoryLabel: string;
	categorySlug: string;
	skills: DiagnosticSkillConfig[];
	initialData?: Record<string, unknown>;
	entryId?: string;
	onCreateAction: (
		data: Record<string, unknown>,
	) => Promise<{ success: boolean }>;
	onUpdateAction?: (
		id: string,
		data: Record<string, unknown>,
	) => Promise<{ success: boolean }>;
}

export function DiagnosticSkillEntryForm({
	categoryEnum,
	categoryLabel,
	categorySlug,
	skills,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
}: DiagnosticSkillEntryFormProps) {
	const router = useRouter();
	const [isPending] = useTransition();
	const [, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;
	const fields = getDiagnosticSkillFields(skills);

	const defaultValues: Record<string, unknown> = {
		diagnosticCategory: categoryEnum,
		skillName: "",
		representativeDiagnosis: "",
		confidenceLevel: "",
		totalTimesPerformed: 0,
		...initialData,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		try {
			const payload = { ...data, diagnosticCategory: categoryEnum };

			if (isEditing && onUpdateAction && entryId) {
				const result = await onUpdateAction(entryId, payload);
				if (result.success) {
					toast.success("Entry updated successfully");
					router.push(`/dashboard/student/diagnostics/${categorySlug}`);
					router.refresh();
				}
			} else {
				const result = await onCreateAction(payload);
				if (result.success) {
					toast.success("Entry created successfully");
					router.push(`/dashboard/student/diagnostics/${categorySlug}`);
					router.refresh();
				}
			}
		} catch {
			toast.error(
				isEditing ? "Failed to update entry" : "Failed to create entry",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<GenericLogForm
			schema={diagnosticSkillSchema as never}
			defaultValues={defaultValues}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={
				isEditing ? `Edit Diagnostic Skill Entry` : `New Diagnostic Skill Entry`
			}
			description={categoryLabel}
		/>
	);
}
