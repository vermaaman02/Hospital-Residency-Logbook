import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
	// Get the first department
	const department = await prisma.department.findFirst();
	if (!department) {
		console.log("No departments found! Cannot assign students.");
		return;
	}

	console.log(
		`\nAssigning all students to department: ${department.name} (${department.id})`,
	);

	// Update all students with null departmentId
	const result = await prisma.user.updateMany({
		where: {
			role: "STUDENT",
			departmentId: null,
		},
		data: {
			departmentId: department.id,
		},
	});

	console.log(`✅ Updated ${result.count} students with departmentId`);

	// Verify the update
	const students = await prisma.user.findMany({
		where: { role: "STUDENT" },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			batchId: true,
			departmentId: true,
		},
	});

	console.log(`\n=== STUDENTS AFTER UPDATE ===`);
	students.forEach((s) =>
		console.log(
			`${s.firstName} ${s.lastName} | batchId=${s.batchId} | deptId=${s.departmentId}`,
		),
	);
}

main()
	.catch(console.error)
	.finally(() => process.exit(0));
