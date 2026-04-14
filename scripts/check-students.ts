import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
	// Get first batch and department
	const [batches, departments, allStudents] = await Promise.all([
		prisma.batch.findMany({ take: 5 }),
		prisma.department.findMany({ take: 5 }),
		prisma.user.findMany({
			where: { role: "STUDENT" },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				batchId: true,
				departmentId: true,
				batch: true,
				department: true,
			},
			take: 10,
		}),
	]);

	console.log("\n=== BATCHES ===");
	batches.forEach((b) => console.log(`${b.id}: ${b.name}`));

	console.log("\n=== DEPARTMENTS ===");
	departments.forEach((d) => console.log(`${d.id}: ${d.name}`));

	console.log("\n=== STUDENTS (first 10) ===");
	allStudents.forEach((s) =>
		console.log(
			`${s.id}: ${s.firstName} ${s.lastName} | batchId=${s.batchId} | deptId=${s.departmentId} | batch=${s.batch} | dept=${s.department}`,
		),
	);

	if (batches.length && departments.length) {
		console.log(`\n=== CHECKING STUDENTS FOR FIRST BATCH & DEPT ===`);
		const studentsInFilter = await prisma.user.findMany({
			where: {
				role: "STUDENT",
				batchId: batches[0].id,
				departmentId: departments[0].id,
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
			},
		});
		console.log(
			`Found ${studentsInFilter.length} students for batchId=${batches[0].id}, deptId=${departments[0].id}`,
		);
		studentsInFilter.forEach((s) =>
			console.log(`  - ${s.firstName} ${s.lastName}`),
		);
	}
}

main()
	.catch(console.error)
	.finally(() => process.exit(0));
