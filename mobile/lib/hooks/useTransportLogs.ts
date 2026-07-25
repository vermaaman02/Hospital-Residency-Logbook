import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface TransportLogEntry {
	id: string;
	userId: string;
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
	totalProcedureTally?: number;
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

export interface TransportFacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface TransportSummaryData {
	totalCount: number;
	signedCount: number;
	submittedCount: number;
	maxEntries: number;
	faculty: TransportFacultyOption[];
}

export function useTransportLogs({
	mode = "student",
}: {
	mode?: "student" | "review";
} = {}) {
	const queryClient = useQueryClient();

	// 1. Entries query
	const entriesQuery = useQuery({
		queryKey: ["transport-logs", "entries", mode],
		queryFn: async () => {
			if (mode === "review") {
				const res = await apiClient.get("/api/v1/transport?mode=review");
				const payload = res.data?.data || res.data;
				return (payload?.entries || []) as TransportLogEntry[];
			}
			const res = await apiClient.get("/api/v1/transport");
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as TransportLogEntry[];
		},
	});

	// 2. Summary query
	const summaryQuery = useQuery({
		queryKey: ["transport-logs", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/transport?view=summary");
			const payload = res.data?.data || res.data;
			return payload as TransportSummaryData;
		},
		enabled: mode === "student",
	});

	// Mutations
	const addRowMutation = useMutation({
		mutationFn: async () => {
			const res = await apiClient.post("/api/v1/transport", { action: "add" });
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
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
				performedAtLocation?: string | null;
				skillLevel?: string | null;
				totalProcedureTally?: number;
				facultyId?: string | null;
			};
		}) => {
			const res = await apiClient.post("/api/v1/transport", {
				action: "update",
				id,
				data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/transport", {
				action: "submit",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/transport", {
				action: "delete",
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const res = await apiClient.post("/api/v1/transport", {
				action: "sign",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const res = await apiClient.post("/api/v1/transport", {
				action: "reject",
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transport-logs"] });
		},
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		refetchEntries: entriesQuery.refetch,
		summary: summaryQuery.data,
		addRow: () => addRowMutation.mutateAsync(),
		isAddingRow: addRowMutation.isPending,
		updateEntry: (args: { id: string; data: any }) => updateMutation.mutateAsync(args),
		submitEntry: (id: string) => submitMutation.mutateAsync(id),
		deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
		signEntry: (args: { id: string; remark?: string }) => signMutation.mutateAsync(args),
		rejectEntry: (args: { id: string; remark: string }) => rejectMutation.mutateAsync(args),
	};
}
