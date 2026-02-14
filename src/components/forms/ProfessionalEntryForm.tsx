/**
 * @module ProfessionalEntryForm
 * @description Reusable form for H1 (Courses), H2 (Conferences), H3 (Research),
 * H4 (Disaster Drills), H5 (Quality Improvement).
 * Uses GenericLogForm internally with configurable fields.
 *
 * @see PG Logbook .md — Professional Development sections
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { GenericLogForm } from "@/components/forms/GenericLogForm";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { FormFieldConfig } from "@/types";
import {
	courseAttendedSchema,
	conferenceParticipationSchema,
	researchActivitySchema,
	disasterDrillSchema,
	qualityImprovementSchema,
} from "@/lib/validators/professional";
import type { ZodType } from "zod";

const SCHEMA_MAP: Record<string, ZodType> = {
	course: courseAttendedSchema as never,
	conference: conferenceParticipationSchema as never,
	research: researchActivitySchema as never,
	disaster: disasterDrillSchema as never,
	qi: qualityImprovementSchema as never,
};

interface ProfessionalEntryFormProps {
	formType: "course" | "conference" | "research" | "disaster" | "qi";
	fields: FormFieldConfig[];
	title: string;
	description: string;
	redirectPath: string;
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

export function ProfessionalEntryForm({
	formType,
	fields,
	title,
	description,
	redirectPath,
	initialData,
	entryId,
	onCreateAction,
	onUpdateAction,
}: ProfessionalEntryFormProps) {
	const router = useRouter();
	const [isPending] = useTransition();
	const [, setIsSubmitting] = useState(false);

	const isEditing = !!entryId && !!onUpdateAction;
	const schema = SCHEMA_MAP[formType];

	const defaultValues: Record<string, unknown> = {
		date: "",
		...Object.fromEntries(fields.map((f) => [f.name, ""])),
		...initialData,
	};

	async function handleSubmit(data: Record<string, unknown>) {
		setIsSubmitting(true);
		try {
			if (isEditing && onUpdateAction && entryId) {
				const result = await onUpdateAction(entryId, data);
				if (result.success) {
					toast.success("Entry updated successfully");
					router.push(redirectPath);
					router.refresh();
				}
			} else {
				const result = await onCreateAction(data);
				if (result.success) {
					toast.success("Entry created successfully");
					router.push(redirectPath);
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
			schema={schema as never}
			defaultValues={defaultValues}
			fields={fields}
			onSubmit={handleSubmit as never}
			title={isEditing ? `Edit ${title}` : `New ${title}`}
			description={description}
		/>
	);
}
