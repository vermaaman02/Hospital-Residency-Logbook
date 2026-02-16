/**
 * @module StudentProfileRedirect
 * @description Redirects to the universal profile page at /dashboard/profile.
 * Kept for backwards compatibility with existing links/bookmarks.
 */

import { redirect } from "next/navigation";

export default function StudentProfilePage() {
	redirect("/dashboard/profile");
}
