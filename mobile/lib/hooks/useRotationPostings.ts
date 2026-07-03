/**
 * Hook for managing rotation postings (PG Logbook — LOG OF ROTATION POSTINGS).
 * Fetches all 20 rotations (7 core + 13 elective) with status, create/update/submit/delete.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type RotationPostingStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export interface RotationPosting {
	id: string;
	slNo: number;
	rotationName: string;
	isElective: boolean;
	startDate: string | null;
	endDate: string | null;
	totalDuration: string | null;
	durationDays: number | null;
	status: RotationPostingStatus;
	facultyId: string | null;
	facultyRemark: string | null;
	attachments: string[];
	createdAt: string;
	signedByName?: string | null;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

// Constants matching the web version
export const ROTATION_POSTINGS = [
	// Core Postings (1-7)
	{ slNo: 1, name: "Emergency Medicine", isElective: false },
	{ slNo: 2, name: "Critical Care", isElective: false },
	{ slNo: 3, name: "Trauma surgery (including Ortho trauma & Neuro Trauma)", isElective: false },
	{ slNo: 4, name: "Neonatal ICU", isElective: false },
	{ slNo: 5, name: "Cardiology", isElective: false },
	{ slNo: 6, name: "Medicine", isElective: false },
	{ slNo: 7, name: "Pediatric Emergency and critical care", isElective: false },

	// Elective Postings (8-20)
	{ slNo: 8, name: "Nephrology", isElective: true },
	{ slNo: 9, name: "Gastroenterology", isElective: true },
	{ slNo: 10, name: "Neurology", isElective: true },
	{ slNo: 11, name: "Anesthesia", isElective: true },
	{ slNo: 12, name: "Pulmonary Medicine & Sleep disorders", isElective: true },
	{ slNo: 13, name: "Hematology Medical Oncology", isElective: true },
	{ slNo: 14, name: "Dermatology", isElective: true },
	{ slNo: 15, name: "Psychiatry", isElective: true },
	{ slNo: 16, name: "Obstetrics & Gynecology", isElective: true },
	{ slNo: 17, name: "Oto-rhino laryngology", isElective: true },
	{ slNo: 18, name: "Ophthalmology", isElective: true },
	{ slNo: 19, name: "Forensic Medicine", isElective: true },
	{ slNo: 20, name: "Community Medicine", isElective: true },
] as const;

async function fetchRotationPostings(): Promise<RotationPosting[]> {
	const { data } = await apiClient.get("/api/v1/rotation-postings");
	return data.data ?? [];
}

async function fetchFacultyList(): Promise<FacultyOption[]> {
	const { data } = await apiClient.get("/api/v1/faculty/names");
	return data.data ?? [];
}

interface CreatePostingData {
	rotationName: string;
	startDate?: Date;
	endDate?: Date;
	totalDuration?: string;
	facultyId?: string;
}

interface UpdatePostingData extends CreatePostingData {
	id: string;
}

async function createPosting(data: CreatePostingData) {
	const { data: response } = await apiClient.post("/api/v1/rotation-postings", {
		action: "create",
		rotationName: data.rotationName,
		startDate: data.startDate?.toISOString(),
		endDate: data.endDate?.toISOString(),
		totalDuration: data.totalDuration,
		facultyId: data.facultyId,
	});
	return response;
}

async function updatePosting(data: UpdatePostingData) {
	const { data: response } = await apiClient.post("/api/v1/rotation-postings", {
		action: "update",
		id: data.id,
		rotationName: data.rotationName,
		startDate: data.startDate?.toISOString(),
		endDate: data.endDate?.toISOString(),
		totalDuration: data.totalDuration,
		facultyId: data.facultyId,
	});
	return response;
}

async function submitPosting(id: string) {
	const { data: response } = await apiClient.post("/api/v1/rotation-postings", {
		action: "submit",
		id,
	});
	return response;
}

async function deletePosting(id: string) {
	const { data: response } = await apiClient.post("/api/v1/rotation-postings", {
		action: "delete",
		id,
	});
	return response;
}

export function useRotationPostings() {
	const qc = useQueryClient();

	const { data: postings = [], isLoading, error, refetch } = useQuery({
		queryKey: ["rotation-postings"],
		queryFn: fetchRotationPostings,
	});

	const { data: facultyList = [] } = useQuery({
		queryKey: ["faculty-list"],
		queryFn: fetchFacultyList,
	});

	const createMutation = useMutation({
		mutationFn: createPosting,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["rotation-postings"] }),
	});

	const updateMutation = useMutation({
		mutationFn: updatePosting,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["rotation-postings"] }),
	});

	const submitMutation = useMutation({
		mutationFn: submitPosting,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["rotation-postings"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: deletePosting,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["rotation-postings"] }),
	});

	// Map postings by rotation name for easy lookup
	const postingsByName = new Map(postings.map((p) => [p.rotationName, p]));

	// Get core and elective postings
	const corePostings = ROTATION_POSTINGS.filter((r) => !r.isElective);
	const electivePostings = ROTATION_POSTINGS.filter((r) => r.isElective);

	// Stats
	const stats = {
		coreFilled: corePostings.filter((r) => postingsByName.has(r.name)).length,
		electiveFilled: electivePostings.filter((r) => postingsByName.has(r.name)).length,
		signed: postings.filter((p) => p.status === "SIGNED").length,
		pending: postings.filter((p) => p.status === "SUBMITTED").length,
		needsRevision: postings.filter((p) => p.status === "NEEDS_REVISION").length,
		total: postings.length,
	};

	return {
		postings,
		postingsByName,
		facultyList,
		corePostings,
		electivePostings,
		stats,
		isLoading,
		error,
		refetch,
		createPosting: createMutation.mutateAsync,
		updatePosting: updateMutation.mutateAsync,
		submitPosting: submitMutation.mutateAsync,
		deletePosting: deleteMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isSubmitting: submitMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
