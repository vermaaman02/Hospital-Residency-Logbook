/**
 * @module ProcedureLogEntryForm
 * @description Reusable form for creating/editing procedure log entries.
 * Works for ALL 49 categories — dynamically switches skill level options
 * between S/O/A/PS/PI and S/TM/TL based on whether the category is CPR.
 *
 * @see PG Logbook .md — "LOG OF PROCEDURES" (all sections)
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { getProcedureLogFields } from "@/lib/constants/procedure-log-fields";
import { procedureLogSchema } from "@/lib/validators/procedure-log";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProcedureLogEntryFormProps {
	categoryEnum: string;
	categoryLabel: string;
	categorySlug: string;
	isCpr: boolean;
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

export function ProcedureLogEntryForm({
	categoryEnum,
	categoryLabel,
	categorySlug,
	isCpr,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
}: ProcedureLogEntryFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;
	const fields = getProcedureLogFields(isCpr);

	const defaultValues = initialData ?? {
		date: new Date(),
		patientInfo: "",
		completeDiagnosis: "",
		procedureDescription: "",
		performedAtLocation: "",
		skillLevel: undefined,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		startTransition(async () => {
			try {
				// Inject category into data before submission
				const payload = { ...data, procedureCategory: categoryEnum };
				if (isEditing) {
					await onUpdateAction(entryId, payload);
					toast.success("Entry updated successfully");
				} else {
					await onCreateAction(payload);
					toast.success("Entry created successfully");
				}
				router.push(`/dashboard/student/procedures/${categorySlug}`);
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
			schema={procedureLogSchema as never}
			defaultValues={defaultValues as never}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={
				isEditing
					? "Edit Procedure Entry"
					: `New Procedure Entry — ${categoryLabel}`
			}
			description={`Log a procedure entry for ${categoryLabel}`}
		/>
	);
}
