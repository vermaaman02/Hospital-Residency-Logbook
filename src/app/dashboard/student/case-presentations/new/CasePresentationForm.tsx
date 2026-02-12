/**
 * @module CasePresentationForm
 * @description Client form for creating/editing case presentation entries.
 */

"use client";

import { AcademicEntryForm } from "@/components/forms/AcademicEntryForm";
import { casePresentationSchema } from "@/lib/validators/academics";
import { casePresentationFields } from "@/lib/constants/academic-fields";
import {
	createCasePresentation,
	updateCasePresentation,
} from "@/actions/case-presentations";

interface CasePresentationFormProps {
	initialData?: {
		id: string;
		date: Date | string | null;
		patientInfo: string | null;
		completeDiagnosis: string | null;
		category: string | null;
	};
}

export function CasePresentationForm({ initialData }: CasePresentationFormProps) {
	const defaults = initialData
		? {
				date: initialData.date ? new Date(initialData.date) : new Date(),
				patientInfo: initialData.patientInfo ?? "",
				completeDiagnosis: initialData.completeDiagnosis ?? "",
				category: initialData.category ?? undefined,
			}
		: undefined;

	return (
		<AcademicEntryForm
			schema={casePresentationSchema as never}
			fields={casePresentationFields}
			title="Case Presentation"
			description="Academic Case Presentation and Discussion"
			initialData={defaults as Record<string, unknown> | undefined}
			entryId={initialData?.id}
			onCreateAction={createCasePresentation as never}
			onUpdateAction={updateCasePresentation as never}
			backHref="/dashboard/student/case-presentations"
		/>
	);
}
