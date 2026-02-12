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

	const params = await searchParams;
	const users = await getAllUsers(params.search);

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
			<UserManagementClient users={users} />
		</div>
	);
}
