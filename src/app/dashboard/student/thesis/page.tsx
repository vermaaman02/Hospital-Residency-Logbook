/**
 * @module ThesisTrackingPage
 * @description Redirects to the unified rotation-postings page (Thesis tab).
 * The thesis section is now part of the 3-tab rotation-postings page.
 *
 * @see src/app/dashboard/student/rotation-postings/page.tsx
 */

import { redirect } from "next/navigation";

export default function ThesisTrackingPage() {
	redirect("/dashboard/student/rotation-postings?tab=thesis");
}
