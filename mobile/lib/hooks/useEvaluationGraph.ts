import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface EvaluationRecord {
	id: string;
	userId: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	theoryMarks: string | null;
	practicalMarks: string | null;
	evaluatedById: string | null;
	remarks: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export function useEvaluationGraph() {
	const recordsQuery = useQuery({
		queryKey: ["evaluation-graph", "records"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/evaluation-graph");
			const payload = res.data?.data || res.data;
			return (payload?.records || []) as EvaluationRecord[];
		},
	});

	return {
		records: recordsQuery.data || [],
		isLoading: recordsQuery.isLoading,
		refetch: recordsQuery.refetch,
	};
}
