import { isUserSetupComplete } from "@/actions/form-definitions";
import { SetupRequiredView } from "@/components/dashboard/SetupRequiredView";

export default async function FacultyLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const setup = await isUserSetupComplete();

	if (!setup.isComplete) {
		return (
			<SetupRequiredView
				role="faculty"
				missingBatch={setup.missingBatch}
				missingDepartment={setup.missingDepartment}
			/>
		);
	}

	return <>{children}</>;
}
