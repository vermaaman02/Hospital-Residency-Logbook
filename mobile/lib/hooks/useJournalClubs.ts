import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export type EntryStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export type JournalClub = {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	journalArticle: string | null;
	typeOfStudy: string | null;
	facultyRemark: string | null;
	status: EntryStatus;
	createdAt: string;
	updatedAt: string;
	facultyId: string | null;
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	};
};

export type JournalClubInput = {
	date?: string | Date | null;
	journalArticle?: string | null;
	typeOfStudy?: string | null;
	facultyRemark?: string | null;
	facultyId?: string | null;
};

export function useJournalClubs(options?: { mode?: "review" }) {
	const qc = useQueryClient();
	const mode = options?.mode;

	const {
		data: journalClubs = [],
		isLoading,
		error,
		refetch,
	} = useQuery<JournalClub[]>({
		queryKey: ["journal-clubs", mode],
		queryFn: async () => {
			const url = mode === "review" ? "/api/v1/journal-clubs?mode=review" : "/api/v1/journal-clubs";
			const { data } = await apiClient.get(url);
			return data.data || [];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: JournalClubInput) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "create",
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: JournalClubInput }) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "update",
				id,
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "submit",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "delete",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "sign",
				id,
				remark,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const { data: res } = await apiClient.post("/api/v1/journal-clubs", {
				action: "reject",
				id,
				remark,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["journal-clubs"] }),
	});

	return {
		journalClubs,
		isLoading,
		error,
		refetch,
		createJournalClub: createMutation.mutateAsync,
		updateJournalClub: updateMutation.mutateAsync,
		submitJournalClub: submitMutation.mutateAsync,
		deleteJournalClub: deleteMutation.mutateAsync,
		signJournalClub: signMutation.mutateAsync,
		rejectJournalClub: rejectMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isSubmitting: submitMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isSigning: signMutation.isPending,
		isRejecting: rejectMutation.isPending,
	};
}
