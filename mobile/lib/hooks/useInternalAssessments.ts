import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export type AssessmentType =
	| "THEORY"
	| "PRACTICAL"
	| "VIVA"
	| "ASSIGNMENT"
	| "PROJECT"
	| "OTHER";

export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";

export type EvaluationInfo = {
	marks: number | null;
	grade: string | null;
	feedback: string | null;
	rejectionReason: string | null;
	evaluatedAt: string | null;
	evaluatedBy: { firstName: string; lastName: string } | null;
};

export type SubmissionInfo = {
	id: string;
	status: SubmissionStatus;
	content: string | null;
	attachments: string[];
	submittedAt: string | null;
	evaluation: EvaluationInfo | null;
	student?: { id: string; firstName: string; lastName: string; email?: string };
};

export type InternalAssessment = {
	id: string;
	title: string;
	description: string | null;
	assessmentType: AssessmentType;
	batch: { id: string; name: string };
	createdBy: { id: string; firstName: string; lastName: string };
	deadline: string | null;
	resourceLinks: string[];
	attachments: string[];
	maxMarks: number | null;
	totalMarks: number | null;
	isPublished: boolean;
	createdAt: string;
	submissions: SubmissionInfo[];
};

export function useInternalAssessments(options?: { mode?: "faculty" | "hod" }) {
	const qc = useQueryClient();
	const mode = options?.mode;

	const {
		data: assessments = [],
		isLoading,
		error,
		refetch,
	} = useQuery<InternalAssessment[]>({
		queryKey: ["internal-assessments", mode],
		queryFn: async () => {
			const url = mode ? `/api/v1/assessments?mode=${mode}` : "/api/v1/assessments";
			const { data } = await apiClient.get(url);
			return data.data || [];
		},
	});

	const submitMutation = useMutation({
		mutationFn: async ({
			assessmentId,
			content,
			attachments,
		}: {
			assessmentId: string;
			content?: string;
			attachments?: string[];
		}) => {
			const { data: res } = await apiClient.post("/api/v1/assessments", {
				action: "submit",
				assessmentId,
				content,
				attachments,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["internal-assessments"] }),
	});

	const saveDraftMutation = useMutation({
		mutationFn: async ({
			assessmentId,
			content,
			attachments,
		}: {
			assessmentId: string;
			content?: string;
			attachments?: string[];
		}) => {
			const { data: res } = await apiClient.post("/api/v1/assessments", {
				action: "save-draft",
				assessmentId,
				content,
				attachments,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["internal-assessments"] }),
	});

	const evaluateMutation = useMutation({
		mutationFn: async ({
			submissionId,
			marks,
			grade,
			feedback,
		}: {
			submissionId: string;
			marks?: number;
			grade?: string;
			feedback?: string;
		}) => {
			const { data: res } = await apiClient.post("/api/v1/assessments", {
				action: "evaluate",
				submissionId,
				marks,
				grade,
				feedback,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["internal-assessments"] }),
	});

	const rejectMutation = useMutation({
		mutationFn: async ({
			submissionId,
			rejectionReason,
		}: {
			submissionId: string;
			rejectionReason: string;
		}) => {
			const { data: res } = await apiClient.post("/api/v1/assessments", {
				action: "reject",
				submissionId,
				rejectionReason,
			});
			return res;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["internal-assessments"] }),
	});

	return {
		assessments,
		isLoading,
		error,
		refetch,
		submitAssessment: submitMutation.mutateAsync,
		saveDraftSubmission: saveDraftMutation.mutateAsync,
		evaluateSubmission: evaluateMutation.mutateAsync,
		rejectSubmission: rejectMutation.mutateAsync,
		isSubmitting: submitMutation.isPending,
		isSavingDraft: saveDraftMutation.isPending,
		isEvaluating: evaluateMutation.isPending,
		isRejecting: rejectMutation.isPending,
	};
}
