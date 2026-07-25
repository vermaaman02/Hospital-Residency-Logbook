import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ImagingLogEntry {
	id: string;
	userId: string;
	imagingCategory: string;
	slNo: number;
	date: string | null;
	patientName: string | null;
	patientAge: number | null;
	patientSex: string | null;
	uhid: string | null;
	completeDiagnosis: string | null;
	procedureDescription: string | null;
	performedAtLocation: string | null;
	skillLevel: "S" | "O" | "A" | "PS" | "PI" | null;
	totalImagingTally: number;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyId: string | null;
	facultyRemark: string | null;
	createdAt: string;
	updatedAt: string;
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		batchRelation?: { name: string };
	};
}

export interface ImagingFacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface ImagingSummaryData {
	totalByCategory: Record<string, number>;
	signedByCategory: Record<string, number>;
	faculty: ImagingFacultyOption[];
}

export function useImagingLogs({
	category,
	mode = "student",
}: {
	category?: string;
	mode?: "student" | "review";
} = {}) {
	const queryClient = useQueryClient();

	// 1. Category entries list query
	const entriesQuery = useQuery({
		queryKey: ["imaging-logs", "entries", category, mode],
		queryFn: async () => {
			if (mode === "review") {
				const res = await apiClient.get(
					`/api/v1/imaging?mode=review${category ? `&category=${category}` : ""}`,
				);
				const payload = res.data?.data || res.data;
				return (payload?.entries || []) as ImagingLogEntry[];
			}
			if (!category) return [];
			const res = await apiClient.get(`/api/v1/imaging?category=${category}`);
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as ImagingLogEntry[];
		},
		enabled: mode === "review" || Boolean(category),
	});

	// 2. Summary query (5 categories stats & available faculty list)
	const summaryQuery = useQuery({
		queryKey: ["imaging-logs", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/imaging?view=summary");
			const payload = res.data?.data || res.data;
			return payload as ImagingSummaryData;
		},
		enabled: mode === "student",
	});

	// Mutations
	const initCategoryMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "init",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const addRowMutation = useMutation({
		mutationFn: async (cat: string) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "add",
				category: cat,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: {
				date?: string | null;
				patientName?: string | null;
				patientAge?: number | null;
				patientSex?: string | null;
				uhid?: string | null;
				completeDiagnosis?: string | null;
				procedureDescription?: string | null;
				imagingType?: string | null;
				performedAtLocation?: string | null;
				skillLevel?: string | null;
				totalImagingTally?: number;
				facultyId?: string | null;
			};
		}) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "update",
				id,
				data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "submit",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "delete",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "sign",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const res = await apiClient.post("/api/v1/imaging", {
				action: "reject",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["imaging-logs"] });
		},
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		refetchEntries: entriesQuery.refetch,

		summary: summaryQuery.data,
		isLoadingSummary: summaryQuery.isLoading,
		refetchSummary: summaryQuery.refetch,

		initCategory: initCategoryMutation.mutateAsync,
		isInitializing: initCategoryMutation.isPending,

		addRow: addRowMutation.mutateAsync,
		isAddingRow: addRowMutation.isPending,

		updateEntry: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,

		submitEntry: submitMutation.mutateAsync,
		isSubmitting: submitMutation.isPending,

		deleteEntry: deleteMutation.mutateAsync,
		isDeleting: deleteMutation.isPending,

		signEntry: signMutation.mutateAsync,
		isSigning: signMutation.isPending,

		rejectEntry: rejectMutation.mutateAsync,
		isRejecting: rejectMutation.isPending,
	};
}
