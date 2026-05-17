/**
 * Fetches the full profile from GET /api/v1/me/profile-full.
 * Includes thesis, assigned faculty/students, logbook stats — mirrors web ProfileClient data.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ProfileFullData = {
	clerkId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profileImage: string | null;
	role: "Student" | "Faculty" | "HOD";
	batch: string | null;
	currentSemester: number | null;
	department: string | null;
	status: string;
	joinedAt: string | null;
	thesisTopic: string | null;
	thesisGuide: string | null;
	thesisStatus: string | null;
	assignedFaculty: { semester: number; name: string }[];
	assignedStudents: { semester: number; name: string }[];
	logbookStats: Record<string, number>;
};

async function fetchProfileFull(): Promise<ProfileFullData> {
	const res = await apiClient.get<{ ok: boolean; data: ProfileFullData }>(
		"/api/v1/me/profile-full",
	);
	if (!res.data.ok || !res.data.data) {
		throw new Error("Failed to load profile");
	}
	return res.data.data;
}

export function useProfileFull() {
	return useQuery({
		queryKey: ["profile-full"],
		queryFn: fetchProfileFull,
		staleTime: 5 * 60 * 1000,
		retry: 2,
	});
}
