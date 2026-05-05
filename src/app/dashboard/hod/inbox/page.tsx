import { requireRole } from "@/lib/auth";
import { getUnifiedInbox } from "@/actions/inbox";
import { ReviewInboxClient } from "@/components/dashboard/ReviewInboxClient";

export const metadata = {
	title: "Review Inbox | Residency Logbook",
};

export default async function HodInboxPage() {
	await requireRole(["hod"]);
	const initialItems = await getUnifiedInbox();

	return <ReviewInboxClient initialItems={initialItems} />;
}
