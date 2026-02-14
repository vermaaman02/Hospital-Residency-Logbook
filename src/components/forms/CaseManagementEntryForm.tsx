/**
 * @module CaseManagementEntryForm
 * @description Reusable form for creating/editing case management entries.
 * Works for ALL 24 categories — sub-category options are injected dynamically.
 *
 * @see PG Logbook .md — "LOG OF CASE MANAGEMENT" (all sections)
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { getCaseManagementFields } from "@/lib/constants/case-management-fields";
import { caseManagementSchema } from "@/lib/validators/case-management";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CaseManagementEntryFormProps {
	categoryEnum: string;
	categoryLabel: string;
	categorySlug: string;
	subCategoryOptions: { value: string; label: string }[];
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

export function CaseManagementEntryForm({
	categoryEnum,
	categoryLabel,
	categorySlug,
	subCategoryOptions,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
}: CaseManagementEntryFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;
	const fields = getCaseManagementFields(subCategoryOptions);

	const defaultValues = initialData ?? {
		caseSubCategory: "",
		date: new Date(),
		patientInfo: "",
		completeDiagnosis: "",
		competencyLevel: undefined,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		startTransition(async () => {
			try {
				// Inject category into data before submission
				const payload = { ...data, category: categoryEnum };
				if (isEditing) {
					await onUpdateAction(entryId, payload);
					toast.success("Entry updated successfully");
				} else {
					await onCreateAction(payload);
					toast.success("Entry created successfully");
				}
				router.push(`/dashboard/student/case-management/${categorySlug}`);
				router.refresh();
			} catch {
				toast.error("Failed to save entry");
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
			schema={caseManagementSchema as never}
			defaultValues={defaultValues as never}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={isEditing ? "Edit Case Entry" : `New Case Entry — ${categoryLabel}`}
			description={`Log a case management entry for ${categoryLabel}`}
		/>
	);
}
