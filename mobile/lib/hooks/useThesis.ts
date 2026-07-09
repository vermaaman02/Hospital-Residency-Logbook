/**
 * Hook for managing student thesis details and semester records in the mobile app.
 * Connects to GET/POST /api/v1/thesis.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ThesisSemesterRecord {
	id: string;
	thesisId: string;
	semester: number;
	srJrMember: string | null;
	srMember: string | null;
	facultyMember: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyRemark: string | null;
}

export interface Thesis {
	id: string;
	userId: string;
	topic: string | null;
	chiefGuide: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyRemark: string | null;
	semesterRecords: ThesisSemesterRecord[];
}

async function fetchThesis(): Promise<Thesis> {
	const { data } = await apiClient.get("/api/v1/thesis");
	return data.data;
}

interface UpdateThesisData {
	topic: string;
	chiefGuide?: string;
}

async function updateThesis(data: UpdateThesisData) {
	const { data: response } = await apiClient.post("/api/v1/thesis", {
		action: "update",
		topic: data.topic,
		chiefGuide: data.chiefGuide,
	});
	return response;
}

async function submitThesis(id: string) {
	const { data: response } = await apiClient.post("/api/v1/thesis", {
		action: "submit",
		id,
	});
	return response;
}

interface UpsertSemesterRecordData {
	thesisId: string;
	semester: number;
	srJrMember?: string | null;
	srMember?: string | null;
	facultyMember?: string | null;
}

async function upsertSemesterRecord(data: UpsertSemesterRecordData) {
	const { data: response } = await apiClient.post("/api/v1/thesis", {
		action: "upsert-semester",
		thesisId: data.thesisId,
		semester: data.semester,
		srJrMember: data.srJrMember,
		srMember: data.srMember,
		facultyMember: data.facultyMember,
	});
	return response;
}

async function submitSemesterRecord(id: string) {
	const { data: response } = await apiClient.post("/api/v1/thesis", {
		action: "submit-semester",
		id,
	});
	return response;
}

export function useThesis() {
	const qc = useQueryClient();

	const { data: thesis, isLoading, error, refetch } = useQuery({
		queryKey: ["thesis"],
		queryFn: fetchThesis,
	});

	const updateThesisMutation = useMutation({
		mutationFn: updateThesis,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["thesis"] }),
	});

	const submitThesisMutation = useMutation({
		mutationFn: submitThesis,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["thesis"] }),
	});

	const upsertSemesterMutation = useMutation({
		mutationFn: upsertSemesterRecord,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["thesis"] }),
	});

	const submitSemesterMutation = useMutation({
		mutationFn: submitSemesterRecord,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["thesis"] }),
	});

	return {
		thesis,
		isLoading,
		error,
		refetch,
		updateThesis: updateThesisMutation.mutateAsync,
		submitThesis: submitThesisMutation.mutateAsync,
		upsertSemester: upsertSemesterMutation.mutateAsync,
		submitSemester: submitSemesterMutation.mutateAsync,
		isUpdatingThesis: updateThesisMutation.isPending,
		isSubmittingThesis: submitThesisMutation.isPending,
		isUpsertingSemester: upsertSemesterMutation.isPending,
		isSubmittingSemester: submitSemesterMutation.isPending,
	};
}
