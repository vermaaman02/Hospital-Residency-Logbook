/**
 * @module ClinicalSkillEditPage
 * @description Edit page for a single clinical skill entry (Adult or Pediatric).
 *
 * @see PG Logbook .md — "LOG OF CLINICAL SKILL TRAINING"
 */

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClinicalSkillEditForm } from "@/components/forms/ClinicalSkillEditForm";
import { updateClinicalSkill } from "@/actions/clinical-skills";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageParams {
	params: Promise<{ type: string; id: string }>;
}

export default async function ClinicalSkillEditPage({ params }: PageParams) {
	const { type, id } = await params;
	const userId = await requireAuth();

	if (type !== "adult" && type !== "pediatric") {
		notFound();
	}

	const model =
		type === "adult"
			? prisma.clinicalSkillAdult
			: prisma.clinicalSkillPediatric;

	const entry = await (model as typeof prisma.clinicalSkillAdult).findUnique({
		where: { id },
	});

	if (!entry || entry.userId !== userId) {
		notFound();
	}

	if (entry.status === "SIGNED") {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Clinical Skill — Signed"
					description="This entry has been signed and cannot be edited."
				/>
				<Button variant="outline" asChild>
					<Link href="/dashboard/student/clinical-skills">
						<ArrowLeft className="mr-2 h-4 w-4" /> Back
					</Link>
				</Button>
			</div>
		);
	}

	const initialData = {
		skillName: entry.skillName,
		representativeDiagnosis: entry.representativeDiagnosis,
		confidenceLevel: entry.confidenceLevel,
		totalTimesPerformed: entry.totalTimesPerformed,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/student/clinical-skills">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<PageHeader
					title={`Edit: ${entry.skillName}`}
					description={`Update your ${type} clinical skill entry`}
				/>
			</div>
			<ClinicalSkillEditForm
				type={type}
				entryId={id}
				initialData={initialData}
				onUpdateAction={updateClinicalSkill as never}
			/>
		</div>
	);
}
