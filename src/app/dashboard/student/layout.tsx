import { isUserSetupComplete } from "@/actions/form-definitions";
import { SetupRequiredView } from "@/components/dashboard/SetupRequiredView";
import { PendingAssessmentPopup } from "@/components/dashboard/PendingAssessmentPopup";

export default async function StudentLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const setup = await isUserSetupComplete();

	if (!setup.isComplete) {
		return (
			<SetupRequiredView
				role="student"
				missingBatch={setup.missingBatch}
				missingDepartment={setup.missingDepartment}
			/>
		);
	}

	return (
		<>
			<PendingAssessmentPopup role="student" />
			{children}
		</>
	);
}
