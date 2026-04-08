import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RotationPostingConfigurationClient } from "@/components/hod/RotationPostingConfigurationClient";
import {
	getRotationPostingConfigurations,
	type RotationConfigWithDetails,
} from "@/actions/rotation-posting-config";
import { prisma } from "@/lib/prisma";

export default async function HodRotationPostingConfigPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	// Fetch all batches and departments
	const [batches, departments] = await Promise.all([
		prisma.batch.findMany({
			where: { isActive: true },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
		prisma.department.findMany({
			where: { isActive: true },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
	]);

	// Set defaults for initial load
	const defaultBatchId = batches[0]?.id || "";
	const defaultDepartmentId = departments[0]?.id || "";
	const defaultSemester = 1;

	// Fetch initial configurations
	let initialConfigs: RotationConfigWithDetails[] = [];
	if (defaultBatchId && defaultDepartmentId) {
		initialConfigs = await getRotationPostingConfigurations(
			defaultBatchId,
			defaultSemester,
			defaultDepartmentId,
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Rotation Posting Configuration"
				description="Enable or disable specific rotation postings for batches, semesters, and departments. This controls which rotations are visible to students."
			/>

			<RotationPostingConfigurationClient
				batches={batches}
				departments={departments}
				initialConfigs={initialConfigs}
				selectedBatchId={defaultBatchId}
				selectedDepartmentId={defaultDepartmentId}
				selectedSemester={defaultSemester}
			/>
		</div>
	);
}
