/**
 * @module ManageUsersPage
 * @description HOD admin panel for user management, batch management,
 * and semester promotion. Tab-based layout.
 *
 * @see copilot-instructions.md — Section 8
 * @see PG Logbook .md — Faculty-student assignment is required for sign-off workflow
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManageUsersClient } from "./ManageUsersClient";
import { getAllUsers } from "@/actions/user-management";
import { getAllBatches } from "@/actions/batch-management";

export default async function ManageUsersPage() {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	let users: Awaited<ReturnType<typeof getAllUsers>> = [];
	let batches: Awaited<ReturnType<typeof getAllBatches>> = [];
	let fetchError = false;

	try {
		[users, batches] = await Promise.all([getAllUsers(), getAllBatches()]);
	} catch (error) {
		console.error("[MANAGE_USERS_FETCH]", error);
		fetchError = true;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="User Management"
				description="Manage users, batches, roles, access control, and semester promotions"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "User Management" },
				]}
			/>
			{fetchError ?
				<div className="border rounded-lg p-8 text-center space-y-2">
					<p className="text-muted-foreground">
						Failed to load data. Please try again.
					</p>
					<p className="text-xs text-muted-foreground/70">
						If this persists, check your CLERK_SECRET_KEY and DATABASE_URL.
					</p>
				</div>
			:	<ManageUsersClient users={users} batches={batches} />}
		</div>
	);
}
