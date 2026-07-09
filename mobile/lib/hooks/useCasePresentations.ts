import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export type PatientCategory =
	| "ADULT_NON_TRAUMA"
	| "ADULT_TRAUMA"
	| "PEDIATRIC_NON_TRAUMA"
	| "PEDIATRIC_TRAUMA"
	| "OTHER";

export type EntryStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export type CasePresentation = {
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

export type CasePresentationInput = {
	date?: string | Date | null;
	patientName?: string | null;
	patientAge?: string | null;
	patientSex?: "Male" | "Female" | "Other" | null;
	uhid?: string | null;
	completeDiagnosis?: string | null;
	category?: PatientCategory | null;
	facultyId?: string | null;
};

export function useCasePresentations() {
	const qc = useQueryClient();

	const {
		data: cases = [],
		isLoading,
		error,
		refetch,
	} = useQuery<CasePresentation[]>({
		queryKey: ["case-presentations"],
		queryFn: async () => {
			const { data } = await apiClient.get("/api/v1/case-presentations");
			return data.data || [];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: CasePresentationInput) => {
			const { data: res } = await apiClient.post("/api/v1/case-presentations", {
				action: "create",
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["case-presentations"] }),
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: CasePresentationInput }) => {
			const { data: res } = await apiClient.post("/api/v1/case-presentations", {
				action: "update",
				id,
				data,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["case-presentations"] }),
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/case-presentations", {
				action: "submit",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["case-presentations"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/case-presentations", {
				action: "delete",
				id,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["case-presentations"] }),
	});

	return {
		cases,
		isLoading,
		error,
		refetch,
		createCase: createMutation.mutateAsync,
		updateCase: updateMutation.mutateAsync,
		submitCase: submitMutation.mutateAsync,
		deleteCase: deleteMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isSubmitting: submitMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
