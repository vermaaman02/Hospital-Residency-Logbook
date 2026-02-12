/**
 * @module RotationPostingsPage
 * @description List all rotation postings for the current student.
 * Shows a table matching the physical logbook's "LOG OF ROTATION POSTINGS DURING PG IN EM".
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 * @see roadmap.md — Phase 2, A1: Rotation Postings
 */

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { RotationPostingsTable } from "./RotationPostingsTable";

export default async function RotationPostingsPage() {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		redirect("/sign-in");
	}

	const postings = await prisma.rotationPosting.findMany({
		where: { userId },
		orderBy: { slNo: "asc" },
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Log of Rotation Postings"
				description="Log of Rotation Postings During Post Graduation in EM — 7 core + 13 elective departments"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard/student" },
					{ label: "Rotation Postings" },
				]}
				actions={
					<Link href="/dashboard/student/rotation-postings/new">
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Add Rotation
						</Button>
					</Link>
				}
			/>

			<RotationPostingsTable postings={postings} />
		</div>
	);
}
