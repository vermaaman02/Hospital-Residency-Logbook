/**
 * @module TrainingMentoringPage
 * @description Redirects to the unified rotation-postings page (Training & Mentoring tab).
 * The training & mentoring section is now part of the 3-tab rotation-postings page.
 *
 * @see src/app/dashboard/student/rotation-postings/page.tsx
 */

import { redirect } from "next/navigation";

export default function TrainingMentoringPage() {
	redirect("/dashboard/student/rotation-postings?tab=training");
}
