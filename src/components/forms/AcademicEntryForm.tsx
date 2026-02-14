/**
 * @module AcademicEntryForm
 * @description Reusable form component for all academic entries
 * (Case Presentations, Seminars, Journal Clubs).
 * Uses GenericLogForm internally.
 *
 * @see PG Logbook .md — Academic sections
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { type FormFieldConfig } from "@/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AcademicEntryFormProps {
	schema: unknown;
	fields: FormFieldConfig[];
	title: string;
	description: string;
	initialData?: Record<string, unknown>;
	entryId?: string;
	onCreateAction: (data: Record<string, unknown>) => Promise<{ success: boolean }>;
	onUpdateAction?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean }>;
	backHref: string;
}

export function AcademicEntryForm({
	schema,
	fields,
	title,
	description,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
	backHref,
}: AcademicEntryFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;

	const defaultValues = initialData ?? {
		date: new Date(),
		patientInfo: "",
		completeDiagnosis: "",
		category: undefined,
		journalArticle: "",
		typeOfStudy: "",
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		startTransition(async () => {
			try {
				if (isEditing) {
					await onUpdateAction(entryId, data);
					toast.success("Entry updated successfully");
				} else {
					await onCreateAction(data);
					toast.success("Entry created successfully");
				}
				router.push(backHref);
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
			schema={schema as never}
			defaultValues={defaultValues as never}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={title}
			description={description}
		/>
	);
}
