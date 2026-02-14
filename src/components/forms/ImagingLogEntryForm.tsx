/**
 * @module ImagingLogEntryForm
 * @description Reusable form for creating/editing imaging log entries.
 * Works for all 5 imaging categories.
 * All categories use S/O/A/PS/PI skill levels.
 *
 * @see PG Logbook .md — "IMAGING LOGS"
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { getImagingLogFields } from "@/lib/constants/imaging-log-fields";
import { imagingLogSchema } from "@/lib/validators/imaging-log";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ImagingLogEntryFormProps {
	categoryEnum: string;
	categoryLabel: string;
	categorySlug: string;
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

export function ImagingLogEntryForm({
	categoryEnum,
	categoryLabel,
	categorySlug,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
}: ImagingLogEntryFormProps) {
	const router = useRouter();
	const [isPending] = useTransition();
	const [, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;
	const fields = getImagingLogFields();

	const defaultValues: Record<string, unknown> = {
		imagingCategory: categoryEnum,
		date: "",
		patientInfo: "",
		completeDiagnosis: "",
		procedureDescription: "",
		performedAtLocation: "",
		skillLevel: "",
		...initialData,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		try {
			const payload = { ...data, imagingCategory: categoryEnum };

			if (isEditing && onUpdateAction && entryId) {
				const result = await onUpdateAction(entryId, payload);
				if (result.success) {
					toast.success("Entry updated successfully");
					router.push(`/dashboard/student/imaging/${categorySlug}`);
					router.refresh();
				}
			} else {
				const result = await onCreateAction(payload);
				if (result.success) {
					toast.success("Entry created successfully");
					router.push(`/dashboard/student/imaging/${categorySlug}`);
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
			schema={imagingLogSchema as never}
			defaultValues={defaultValues}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={isEditing ? `Edit Imaging Log Entry` : `New Imaging Log Entry`}
			description={categoryLabel}
		/>
	);
}
