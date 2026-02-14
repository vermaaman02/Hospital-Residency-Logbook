/**
 * @module SeminarList
 * @description Client component wrapping AcademicEntryTable for seminars.
 */

"use client";

import { AcademicEntryTable } from "@/components/tables/AcademicEntryTable";
import { submitSeminar, deleteSeminar } from "@/actions/seminars";
import { PATIENT_CATEGORY_OPTIONS } from "@/lib/constants/academic-fields";

interface SeminarEntry {
	id: string;
	slNo: number;
	date: Date | string | null;
	patientInfo: string | null;
	completeDiagnosis: string | null;
	category: string | null;
	facultyRemark: string | null;
	status: string;
	[key: string]: unknown;
}

interface SeminarListProps {
	entries: SeminarEntry[];
}

export function SeminarList({ entries }: SeminarListProps) {
	const categoryLabel = (val: string | null) => {
		if (!val) return "—";
		return PATIENT_CATEGORY_OPTIONS.find((o) => o.value === val)?.label ?? val;
	};

	return (
		<AcademicEntryTable
			entries={entries}
			title="Seminars"
			description="Seminar/Evidence Based Discussion Presented"
			targetCount={10}
			newEntryHref="/dashboard/student/seminars/new"
			columns={[
				{
					key: "patientInfo",
					label: "Patient Name/Age/Sex/UHID",
				},
				{
					key: "completeDiagnosis",
					label: "Complete Diagnosis",
				},
				{
					key: "category",
					label: "Category",
					render: (entry) => categoryLabel(entry.category as string | null),
				},
			]}
			onSubmit={submitSeminar}
			onDelete={deleteSeminar}
		/>
	);
}
