import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CourseEntry {
	id: string;
	userId: string;
	slNo: number;
	date: string | null;
	courseName: string | null;
	conductedAt: string | null;
	confidenceLevel: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyId: string | null;
	facultyRemark: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface CourseSummaryData {
	total: number;
	signed: number;
	submitted: number;
	needsRevision: number;
	faculty: FacultyOption[];
}

export function useLifeSupportCourses() {
	const queryClient = useQueryClient();

	const entriesQuery = useQuery({
		queryKey: ["life-support-courses", "entries"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/life-support-courses");
			const payload = res.data?.data || res.data;
			return (payload?.entries || []) as CourseEntry[];
		},
	});

	const summaryQuery = useQuery({
		queryKey: ["life-support-courses", "summary"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/life-support-courses?view=summary");
			const payload = res.data?.data || res.data;
			return payload as CourseSummaryData;
		},
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["life-support-courses"] });
	};

	const addRowMutation = useMutation({
		mutationFn: async () => {
			const res = await apiClient.post("/api/v1/life-support-courses", { action: "add" });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<CourseEntry> }) => {
			const res = await apiClient.post("/api/v1/life-support-courses", { action: "update", id, data });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/life-support-courses", { action: "submit", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await apiClient.post("/api/v1/life-support-courses", { action: "delete", id });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		refetchEntries: entriesQuery.refetch,
		summary: summaryQuery.data,
		faculty: summaryQuery.data?.faculty || [],
		addRow: () => addRowMutation.mutateAsync(),
		isAddingRow: addRowMutation.isPending,
		updateEntry: (id: string, data: Partial<CourseEntry>) => updateMutation.mutateAsync({ id, data }),
		submitEntry: (id: string) => submitMutation.mutateAsync(id),
		deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
	};
}
