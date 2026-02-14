/**
 * @module SeminarForm
 * @description Client form for creating/editing seminar entries.
 */

"use client";

import { AcademicEntryForm } from "@/components/forms/AcademicEntryForm";
import { seminarSchema } from "@/lib/validators/academics";
import { seminarFields } from "@/lib/constants/academic-fields";
import { createSeminar, updateSeminar } from "@/actions/seminars";

interface SeminarFormProps {
	initialData?: {
		id: string;
		date: Date | string | null;
		patientInfo: string | null;
		completeDiagnosis: string | null;
		category: string | null;
	};
}

export function SeminarForm({ initialData }: SeminarFormProps) {
	const defaults =
		initialData ?
			{
				date: initialData.date ? new Date(initialData.date) : new Date(),
				patientInfo: initialData.patientInfo ?? "",
				completeDiagnosis: initialData.completeDiagnosis ?? "",
				category: initialData.category ?? undefined,
			}
		:	undefined;

	return (
		<AcademicEntryForm
			schema={seminarSchema as never}
			fields={seminarFields}
			title="Seminar"
			description="Seminar/Evidence Based Discussion"
			initialData={defaults as Record<string, unknown> | undefined}
			entryId={initialData?.id}
			onCreateAction={createSeminar as never}
			onUpdateAction={updateSeminar as never}
			backHref="/dashboard/student/seminars"
		/>
	);
}
