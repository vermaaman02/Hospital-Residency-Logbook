import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type SkillCategory = "adult" | "pediatric";
export type SkillStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export interface ClinicalSkillItem {
	id: string;
	userId: string;
	slNo: number;
	skillName: string;
	representativeDiagnosis: string | null;
	confidenceLevel: string | null;
	totalTimesPerformed: number;
	facultyId: string | null;
	status: SkillStatus;
	facultyRemark: string | null;
	createdAt: string;
	updatedAt: string;
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		currentSemester: number | null;
		batchRelation?: { name: string };
	};
	signatures?: Array<{
		id: string;
		signedBy: { id: string; firstName: string; lastName: string };
		createdAt: string;
	}>;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
}

export interface ClinicalSkillsResponse {
	skills: ClinicalSkillItem[];
	faculty?: FacultyOption[];
}

export function useClinicalSkills({
	type = "adult",
	mode,
}: {
	type?: SkillCategory;
	mode?: "review" | "faculty-list";
} = {}) {
	const queryClient = useQueryClient();
	const queryKey = ["clinical-skills", type, mode];

	const query = useQuery<ClinicalSkillsResponse>({
		queryKey,
		queryFn: async () => {
			const params = new URLSearchParams({ type });
			if (mode) params.set("mode", mode);
			const { data } = await apiClient.get<ClinicalSkillsResponse>(
				`/api/v1/clinical-skills?${params.toString()}`
			);
			return data;
		},
		staleTime: 1000 * 60 * 2, // 2 minutes
	});

	const skills = query.data?.skills ?? [];
	const faculty = query.data?.faculty ?? [];

	// Progress calculation (signed off count / total count)
	const signedCount = skills.filter((s) => s.status === "SIGNED").length;
	const totalCount = skills.length;

	// Mutations
	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: {
				representativeDiagnosis: string | null;
				confidenceLevel: string | null;
				totalTimesPerformed: number;
				facultyId: string | null;
			};
		}) => {
			const { data: res } = await apiClient.post("/api/v1/clinical-skills", {
				action: "update",
				type,
				id,
				data,
			});
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clinical-skills"] });
		},
	});

	const submitMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data: res } = await apiClient.post("/api/v1/clinical-skills", {
				action: "submit",
				type,
				id,
			});
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clinical-skills"] });
		},
	});

	const signMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark?: string }) => {
			const { data: res } = await apiClient.post("/api/v1/clinical-skills", {
				action: "sign",
				type,
				id,
				remark,
			});
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clinical-skills"] });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
			const { data: res } = await apiClient.post("/api/v1/clinical-skills", {
				action: "reject",
				type,
				id,
				remark,
			});
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clinical-skills"] });
		},
	});

	return {
		skills,
		faculty,
		signedCount,
		totalCount,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		refetch: query.refetch,
		updateSkill: updateMutation.mutateAsync,
		submitSkill: submitMutation.mutateAsync,
		signSkill: signMutation.mutateAsync,
		rejectSkill: rejectMutation.mutateAsync,
		isUpdating: updateMutation.isPending,
		isSubmitting: submitMutation.isPending,
		isSigning: signMutation.isPending,
		isRejecting: rejectMutation.isPending,
	};
}
