import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export type PatientCategory =
	| "ADULT_NON_TRAUMA"
	| "ADULT_TRAUMA"
	| "PEDIATRIC_NON_TRAUMA"
	| "PEDIATRIC_TRAUMA"
	| "OTHER";

export type EntryStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export type Seminar = {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	completeDiagnosis: string | null;
	category: PatientCategory | null;
	facultyRemark: string | null;
	status: EntryStatus;
	createdAt: string;
	updatedAt: string;
	facultyId: string | null;
	patientAge: string | null;
	patientName: string | null;
	patientSex: "Male" | "Female" | "Other" | null;
	uhid: string | null;
};

export type SeminarInput = {
	date?: string | Date | null;
	patientName?: string | null;
	patientAge?: string | null;
	patientSex?: "Male" | "Female" | "Other" | null;
	uhid?: string | null;
	completeDiagnosis?: string | null;
	category?: PatientCategory | null;
	facultyId?: string | null;
};

export function useSeminars() {
	const qc = useQueryClient();

	const {
		data: seminars = [],
		isLoading,
		error,
		refetch,
	} = useQuery<Seminar[]>({
		queryKey: ["seminars"],
		queryFn: async () => {
			const { data } = await apiClient.get("/api/v1/seminars");
			return data.data || [];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: SeminarInput) => {
			const { data: res } = await apiClient.post("/api/v1/seminars", {
				action: "create",
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["seminars"] }),
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: SeminarInput }) => {
			const { data: res } = await apiClient.post("/api/v1/seminars", {
				action: "update",
				id,
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["seminars"] }),
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/seminars", {
				action: "submit",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["seminars"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/seminars", {
				action: "delete",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["seminars"] }),
	});

	return {
		seminars,
		isLoading,
		error,
		refetch,
		createSeminar: createMutation.mutateAsync,
		updateSeminar: updateMutation.mutateAsync,
		submitSeminar: submitMutation.mutateAsync,
		deleteSeminar: deleteMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isSubmitting: submitMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
