/**
 * Hook for fetching resident training and mentoring records in the mobile app.
 * Connects to GET /api/v1/training-mentoring.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface TrainingRecord {
	id: string;
	semester: number;
	knowledgeScore: number | null;
	clinicalSkillScore: number | null;
	proceduralSkillScore: number | null;
	softSkillScore: number | null;
	researchScore: number | null;
	overallScore: number | null;
	evaluatedById: string | null;
	remarks: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
}

async function fetchTrainingRecords(): Promise<TrainingRecord[]> {
	const { data } = await apiClient.get("/api/v1/training-mentoring");
	return data.data ?? [];
}

export function useTrainingMentoring() {
	const { data: records = [], isLoading, error, refetch } = useQuery({
		queryKey: ["training-mentoring"],
		queryFn: fetchTrainingRecords,
	});

	return {
		records,
		isLoading,
		error,
		refetch,
	};
}
