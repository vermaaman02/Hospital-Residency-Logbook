/**
 * @module CasePresentationList
 * @description Client component wrapping AcademicEntryTable for case presentations.
 */

"use client";

import { AcademicEntryTable } from "@/components/tables/AcademicEntryTable";
import {
	submitCasePresentation,
	deleteCasePresentation,
} from "@/actions/case-presentations";
import { PATIENT_CATEGORY_OPTIONS } from "@/lib/constants/academic-fields";

interface CasePresentationEntry {
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

interface CasePresentationListProps {
	entries: CasePresentationEntry[];
}

export function CasePresentationList({ entries }: CasePresentationListProps) {
	const categoryLabel = (val: string | null) => {
		if (!val) return "—";
		return (
			PATIENT_CATEGORY_OPTIONS.find((o) => o.value === val)?.label ?? val
		);
	};

	return (
		<AcademicEntryTable
			entries={entries}
			title="Case Presentations"
			description="Academic Case Presentation and Discussion"
			targetCount={20}
			newEntryHref="/dashboard/student/case-presentations/new"
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
			onSubmit={submitCasePresentation}
			onDelete={deleteCasePresentation}
		/>
	);
}
