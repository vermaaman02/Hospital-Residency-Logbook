/**
 * @module ManageUsersPage
 * @description HOD admin panel for managing user roles and faculty-student assignments.
 * Uses Clerk's Backend SDK to list and update users.
 *
 * @see copilot-instructions.md — Section 8
 * @see PG Logbook .md — Faculty-student assignment is required for sign-off workflow
 */

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserManagementClient } from "./UserManagementClient";
import { getAllUsers } from "@/actions/user-management";

export default async function ManageUsersPage({
	searchParams,
}: {
	searchParams: Promise<{ search?: string }>;
}) {
	try {
		await requireRole(["hod"]);
	} catch {
		redirect("/dashboard/student");
	}

	let users: Awaited<ReturnType<typeof getAllUsers>> = [];
	let fetchError = false;

	try {
		const params = await searchParams;
		users = await getAllUsers(params.search);
	} catch (error) {
		console.error("[MANAGE_USERS_FETCH]", error);
		fetchError = true;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Manage Users"
				description="Assign roles (HOD, Faculty, Student) and manage faculty-student assignments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/hod" },
					{ label: "Manage Users" },
				]}
			/>
			{fetchError ?
				<div className="border rounded-lg p-8 text-center space-y-2">
					<p className="text-muted-foreground">
						Failed to load users from Clerk. Please try again.
					</p>
					<p className="text-xs text-muted-foreground/70">
						If this persists, check the CLERK_SECRET_KEY in your environment.
					</p>
				</div>
			:	<UserManagementClient users={users} />}
		</div>
	);
}
