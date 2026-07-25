import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttendanceEntry {
	id: string;
	attendanceSheetId: string;
	date: string | null;
	day: string;
	presentAbsent: "Present" | "Absent" | "Leave" | "Holiday" | null;
	hodName: string | null;
	markedAt: string | null;
	signedAt: string | null;
	status: "DRAFT" | "SUBMITTED" | "SIGNED" | "NEEDS_REVISION";
	facultyRemark: string | null;
	attendanceSheet: {
		id: string;
		postedDepartment: string | null;
		batch: string | null;
		weekStartDate: string;
	};
}

export interface AttendanceAnalytics {
	totalDays: number;
	presentDays: number;
	absentDays: number;
	leaveDays: number;
	holidayDays: number;
	workingDays: number;
	attendancePct: number;
	minimumPct: number;
	meetsMinimum: boolean;
	totalEntries: number;
	signedEntries: number;
}

export interface AttendanceHoliday {
	id: string;
	date: string;
	name: string;
	batchId: string | null;
}

export interface AttendanceConfig {
	batchId: string;
	batchStartDate: string;
	batchEndDate: string;
	classStartTime: string;
	classEndTime: string;
	locationEnabled: boolean;
	locationLatitude: number | null;
	locationLongitude: number | null;
	locationRadiusMeters: number | null;
	weeklyOffDays: string[];
	minimumAttendancePct: number;
}

export interface FacultyOption {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

export function useAttendance() {
	const queryClient = useQueryClient();

	const entriesQuery = useQuery({
		queryKey: ["attendance", "entries"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/attendance");
			const payload = res.data?.data ?? res.data;
			return (Array.isArray(payload) ? payload : []) as AttendanceEntry[];
		},
	});

	const analyticsQuery = useQuery({
		queryKey: ["attendance", "analytics"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/attendance?view=analytics");
			return (res.data?.data ?? res.data) as AttendanceAnalytics | null;
		},
	});

	const holidaysQuery = useQuery({
		queryKey: ["attendance", "holidays"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/attendance?view=holidays");
			const payload = res.data?.data ?? res.data;
			return (Array.isArray(payload) ? payload : []) as AttendanceHoliday[];
		},
	});

	const configQuery = useQuery({
		queryKey: ["attendance", "config"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/attendance?view=config");
			return (res.data?.data ?? res.data) as AttendanceConfig | null;
		},
	});

	const facultyQuery = useQuery({
		queryKey: ["faculty", "names"],
		queryFn: async () => {
			const res = await apiClient.get("/api/v1/faculty/names");
			const payload = res.data?.data ?? res.data;
			return (Array.isArray(payload) ? payload : []) as FacultyOption[];
		},
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["attendance"] });
	};

	const markMutation = useMutation({
		mutationFn: async (data: {
			date: string;
			presentAbsent: "Present" | "Leave";
			hodName?: string;
			postedDepartment?: string;
			latitude?: number | null;
			longitude?: number | null;
		}) => {
			const res = await apiClient.post("/api/v1/attendance", data);
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const updateMutation = useMutation({
		mutationFn: async (data: {
			entryId: string;
			presentAbsent?: string;
			hodName?: string;
		}) => {
			const res = await apiClient.post("/api/v1/attendance", { action: "update", ...data });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const deleteMutation = useMutation({
		mutationFn: async (entryId: string) => {
			const res = await apiClient.post("/api/v1/attendance", { action: "delete", entryId });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const submitMutation = useMutation({
		mutationFn: async (entryId: string) => {
			const res = await apiClient.post("/api/v1/attendance", { action: "submit", entryId });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	const retractMutation = useMutation({
		mutationFn: async (entryId: string) => {
			const res = await apiClient.post("/api/v1/attendance", { action: "retract", entryId });
			return res.data;
		},
		onSuccess: invalidateAll,
	});

	return {
		entries: entriesQuery.data || [],
		isLoadingEntries: entriesQuery.isLoading,
		analytics: analyticsQuery.data || null,
		isLoadingAnalytics: analyticsQuery.isLoading,
		holidays: holidaysQuery.data || [],
		config: configQuery.data || null,
		facultyList: facultyQuery.data || [],
		isLoadingFaculty: facultyQuery.isLoading,
		markAttendance: markMutation.mutateAsync,
		isMarking: markMutation.isPending,
		updateEntry: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,
		deleteEntry: deleteMutation.mutateAsync,
		isDeleting: deleteMutation.isPending,
		submitEntry: submitMutation.mutateAsync,
		isSubmitting: submitMutation.isPending,
		retractEntry: retractMutation.mutateAsync,
		isRetracting: retractMutation.isPending,
		refetch: invalidateAll,
	};
}
