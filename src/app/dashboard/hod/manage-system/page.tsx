/**
 * @module ManageSystemPage
 * @description HOD system management — Department & Form management
 * with a React Flow canvas for visual hierarchy.
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManageSystemClient } from "./ManageSystemClient";
import { getAllDepartments } from "@/actions/department-management";
import { getAllFormDefinitions } from "@/actions/form-definitions";
import { getAllBatches } from "@/actions/batch-management";

export default async function ManageSystemPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	let departments: Awaited<ReturnType<typeof getAllDepartments>> = [];
	let formDefinitions: Awaited<ReturnType<typeof getAllFormDefinitions>> = [];
	let batches: Awaited<ReturnType<typeof getAllBatches>> = [];
	let fetchError = false;

	try {
		[departments, formDefinitions, batches] = await Promise.all([
			getAllDepartments(),
			getAllFormDefinitions(),
			getAllBatches(),
		]);
	} catch (error) {
		console.error("[MANAGE_SYSTEM_FETCH]", error);
		fetchError = true;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="System Management"
				description="Manage departments, batches, and form access across the institution"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "System Management" },
				]}
			/>
			{fetchError ?
				<div className="border rounded-lg p-8 text-center space-y-2">
					<p className="text-muted-foreground">
						Failed to load data. Please try again.
					</p>
				</div>
			:	<ManageSystemClient
					departments={departments}
					formDefinitions={formDefinitions}
					batches={batches}
				/>
			}
		</div>
	);
}
