import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface LogEntry {
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

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface SectionSummary {
	totalCount: number;
	signedCount: number;
	maxEntries: number;
}

export interface ConsentBadNewsSummaryData {
	consent: SectionSummary;
	badNews: SectionSummary;
	faculty: FacultyOption[];
}

export function useConsentBadNewsLogs({
	mode = "student",
}: {
	mode?: "student" | "review";
} = {}) {
	const queryClient = useQueryClient();

	// 1. Consent Entries query
	const consentEntriesQuery = useQuery({
		queryKey: ["consent-bad-news-logs", "consent", mode],
		queryFn: async () => {
			const url = mode === "review"
				? "/api/v1/consent-bad-news?mode=review&category=consent"
				: "/api/v1/consent-bad-news?category=consent";
			const res = await apiClient.get(url);
			const payload = res.data?.data || res.data;
			return (payload?.entries || payload?.consentEntries || []) as LogEntry[];
		},
	});

	// 2. Bad News Entries query
	const badNewsEntriesQuery = useQuery({
		queryKey: ["consent-bad-news-logs", "bad-news", mode],
		queryFn: async () => {
			const url = mode === "review"
				? "/api/v1/consent-bad-news?mode=review&category=bad-news"
				: "/api/v1/consent-bad-news?category=bad-news";
			const res = await apiClient.get(url);
			const payload = res.data?.data || res.data;
			return (payload?.entries || payload?.badNewsEntries || []) as LogEntry[];
		},
	});

	// 3. Summary query
	const summaryQuery = useQuery({
		queryKey: ["consent-bad-news-logs", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/consent-bad-news?view=summary");
			const payload = res.data?.data || res.data;
			return payload as ConsentBadNewsSummaryData;
		},
		enabled: mode === "student",
	});

	// Mutations
	const addRowMutation = useMutation({
		mutationFn: async (category: "consent" | "bad-news") => {
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "add",
				category,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			category,
			data,
		}: {
			id: string;
			category: "consent" | "bad-news";
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
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "update",
				category,
				id,
				data,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async ({ id, category }: { id: string; category: "consent" | "bad-news" }) => {
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "submit",
				category,
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async ({ id, category }: { id: string; category: "consent" | "bad-news" }) => {
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "delete",
				category,
				id,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({
			id,
			category,
			remark,
		}: {
			id: string;
			category: "consent" | "bad-news";
			remark?: string;
		}) => {
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "sign",
				category,
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({
			id,
			category,
			remark,
		}: {
			id: string;
			category: "consent" | "bad-news";
			remark: string;
		}) => {
			const res = await apiClient.post("/api/v1/consent-bad-news", {
				action: "reject",
				category,
				id,
				remark,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["consent-bad-news-logs"] });
		},
	});

	return {
		consentEntries: consentEntriesQuery.data || [],
		badNewsEntries: badNewsEntriesQuery.data || [],
		isLoadingEntries: consentEntriesQuery.isLoading || badNewsEntriesQuery.isLoading,
		refetchEntries: () => {
			consentEntriesQuery.refetch();
			badNewsEntriesQuery.refetch();
		},
		summary: summaryQuery.data,
		addRow: (category: "consent" | "bad-news") => addRowMutation.mutateAsync(category),
		isAddingRow: addRowMutation.isPending,
		updateEntry: (args: { id: string; category: "consent" | "bad-news"; data: any }) =>
			updateMutation.mutateAsync(args),
		submitEntry: (args: { id: string; category: "consent" | "bad-news" }) =>
			submitMutation.mutateAsync(args),
		deleteEntry: (args: { id: string; category: "consent" | "bad-news" }) =>
			deleteMutation.mutateAsync(args),
		signEntry: (args: { id: string; category: "consent" | "bad-news"; remark?: string }) =>
			signMutation.mutateAsync(args),
		rejectEntry: (args: { id: string; category: "consent" | "bad-news"; remark: string }) =>
			rejectMutation.mutateAsync(args),
	};
}
