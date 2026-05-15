/**
 * @module RevisionThread
 * @description Renders an entry's revision history as a timeline of submissions
 * (with field-level diff vs. previous submission) and reviews (sign / reject /
 * needs-revision with reviewer + remark). Polymorphic — works for any entry.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import {
	getEntryRevisions,
	type RevisionThreadItem,
} from "@/actions/entry-revisions";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	CloudUpload,
	CheckCircle2,
	AlertCircle,
	XCircle,
	Pencil,
} from "lucide-react";

interface RevisionThreadProps {
	entityType: string;
	entityId: string;
	/** Optional list of fields to omit from the diff view (e.g. internal IDs). */
	hideFields?: string[];
}

const decisionMeta: Record<
	string,
	{ icon: React.ReactNode; label: string; className: string }
> = {
	SIGNED: {
		icon: <CheckCircle2 className="h-4 w-4" />,
		label: "Signed",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
	},
	NEEDS_REVISION: {
		icon: <AlertCircle className="h-4 w-4" />,
		label: "Needs Revision",
		className: "bg-amber-50 text-amber-700 border-amber-200",
	},
	REJECTED: {
		icon: <XCircle className="h-4 w-4" />,
		label: "Rejected",
		className: "bg-red-50 text-red-700 border-red-200",
	},
};

function formatValue(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (typeof v === "string") {
		// Render ISO date strings as a readable form.
		if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
			const d = new Date(v);
			if (!Number.isNaN(d.getTime())) return d.toLocaleString();
		}
		return v;
	}
	if (typeof v === "boolean" || typeof v === "number") return String(v);
	if (Array.isArray(v)) return v.length === 0 ? "[]" : `[${v.length} item(s)]`;
	return JSON.stringify(v);
}

function diffSnapshots(
	prev: Record<string, unknown> | null,
	curr: Record<string, unknown> | null,
	hideFields: Set<string>,
): Array<{ field: string; before: unknown; after: unknown; isNew: boolean }> {
	if (!curr) return [];
	const keys = new Set<string>([
		...Object.keys(prev ?? {}),
		...Object.keys(curr),
	]);
	const out: Array<{
		field: string;
		before: unknown;
		after: unknown;
		isNew: boolean;
	}> = [];
	for (const key of keys) {
		if (hideFields.has(key)) continue;
		const before = prev?.[key];
		const after = curr[key];
		const beforeStr = JSON.stringify(before ?? null);
		const afterStr = JSON.stringify(after ?? null);
		if (!prev) {
			// First submission: show all non-empty fields
			if (after !== null && after !== undefined && after !== "") {
				out.push({ field: key, before: null, after, isNew: true });
			}
		} else if (beforeStr !== afterStr) {
			out.push({ field: key, before, after, isNew: false });
		}
	}
	return out.sort((a, b) => a.field.localeCompare(b.field));
}

export function RevisionThread({
	entityType,
	entityId,
	hideFields = [],
}: RevisionThreadProps) {
	const [items, setItems] = useState<RevisionThreadItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [facultyMap, setFacultyMap] = useState<
		Map<string, { firstName: string; lastName: string }>
	>(new Map());

	useEffect(() => {
		let cancelled = false;
		getEntryRevisions(entityType, entityId)
			.then((res) => {
				if (!cancelled) {
					setItems(res);

					// Extract all facultyId values from revisions for rotation postings, case management, procedure logs, diagnostic skills, imaging logs, and transport logs
					if (
						entityType === "RotationPosting" ||
						entityType === "CaseManagementLog" ||
						entityType === "ProcedureLog" ||
						entityType === "DiagnosticSkill" ||
						entityType === "ImagingLog" ||
						entityType === "TransportLog"
					) {
						const facultyIds = new Set<string>();
						for (const item of res) {
							if (
								item.kind === "SUBMISSION" &&
								item.snapshot &&
								item.snapshot.facultyId
							) {
								facultyIds.add(item.snapshot.facultyId as string);
							}
						}

						// Fetch faculty information for these IDs
						if (facultyIds.size > 0) {
							fetch("/api/faculty/names", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									facultyIds: Array.from(facultyIds),
								}),
							})
								.then((r) => r.json())
								.then(
									(
										data: Record<
											string,
											{ firstName: string; lastName: string }
										>,
									) => {
										const map = new Map(Object.entries(data));
										if (!cancelled) setFacultyMap(map);
									},
								)
								.catch((e) =>
									console.error("Failed to fetch faculty names:", e),
								);
						}
					}
				}
			})
			.catch((e: unknown) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load history");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [entityType, entityId]);

	// Pre-compute processed items with submission numbers and diffs
	const processedItems = useMemo(() => {
		if (!items) return [];

		const hideSet = new Set([
			"id",
			"userId",
			"thesisId",
			"attendanceSheetId",
			...hideFields,
		]);

		let prevSubmission: Record<string, unknown> | null = null;
		let submissionCount = 0;

		return items.map((item) => {
			if (item.kind === "SUBMISSION") {
				submissionCount += 1;
				const diff = diffSnapshots(prevSubmission, item.snapshot, hideSet);
				prevSubmission = item.snapshot;
				return {
					...item,
					submissionNumber: submissionCount,
					diff,
				};
			}
			return item;
		});
	}, [items, hideFields]);

	// Helper to format values with faculty name resolution
	const formatValueWithResolution = (
		fieldName: string,
		value: unknown,
	): string => {
		if (fieldName === "facultyId" && typeof value === "string") {
			const faculty = facultyMap.get(value);
			if (faculty) {
				return `${faculty.firstName} ${faculty.lastName}`;
			}
		}
		return formatValue(value);
	};

	if (error) {
		return (
			<div className="text-sm text-red-600 flex items-center gap-2 py-4">
				<XCircle className="h-4 w-4" />
				{error}
			</div>
		);
	}

	if (items === null) {
		return (
			<div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading history...
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground text-sm">
				<Pencil className="h-6 w-6 mx-auto mb-2 opacity-50" />
				<p>No revision history yet.</p>
				<p className="text-xs mt-1">
					History is recorded each time the entry is submitted or reviewed.
				</p>
			</div>
		);
	}

	return (
		<ol className="relative border-l-2 border-muted ml-3 space-y-4 pl-6 py-2">
			{processedItems.map((item) => {
				if (item.kind === "SUBMISSION") {
					const submissionNumber = (
						item as RevisionThreadItem & { submissionNumber: number }
					).submissionNumber;
					const diff = (
						item as RevisionThreadItem & {
							diff: Array<{
								field: string;
								before: unknown;
								after: unknown;
								isNew: boolean;
							}>;
						}
					).diff;
					return (
						<li key={item.id} className="relative">
							<span className="absolute -left-8.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-4 ring-background">
								<CloudUpload className="h-3.5 w-3.5" />
							</span>
							<div className="rounded-lg border bg-indigo-50/40 px-4 py-3">
								<div className="flex items-center gap-2 mb-2">
									<Badge
										variant="outline"
										className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]"
									>
										Submission #{submissionNumber}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{new Date(
											item.submittedAt ?? item.createdAt,
										).toLocaleString()}
									</span>
								</div>
								{diff.length === 0 ?
									<p className="text-xs text-muted-foreground italic">
										No field-level changes recorded.
									</p>
								:	<div className="space-y-1">
										<p className="text-xs font-medium text-muted-foreground">
											{submissionNumber === 1 ?
												"Submitted fields:"
											:	"Changes since previous submission:"}
										</p>
										<dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1 text-xs">
											{diff.map(
												(d: {
													field: string;
													before: unknown;
													after: unknown;
													isNew: boolean;
												}) => (
													<div key={d.field} className="contents">
														<dt className="font-mono text-muted-foreground">
															{d.field}
														</dt>
														<dd className="font-mono">
															{d.isNew ?
																<span className="text-emerald-700">
																	{formatValueWithResolution(d.field, d.after)}
																</span>
															:	<span>
																	<span className="text-red-600 line-through">
																		{formatValueWithResolution(
																			d.field,
																			d.before,
																		)}
																	</span>{" "}
																	→{" "}
																	<span className="text-emerald-700">
																		{formatValueWithResolution(
																			d.field,
																			d.after,
																		)}
																	</span>
																</span>
															}
														</dd>
													</div>
												),
											)}
										</dl>
									</div>
								}
								{item.attachments.length > 0 && (
									<p className="text-[11px] text-muted-foreground mt-2">
										{item.attachments.length} attachment(s)
									</p>
								)}
							</div>
						</li>
					);
				}

				// REVIEW
				const meta =
					decisionMeta[item.decision ?? "NEEDS_REVISION"] ??
					decisionMeta.NEEDS_REVISION;
				return (
					<li key={item.id} className="relative">
						<span
							className={`absolute -left-8.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${meta.className}`}
						>
							{meta.icon}
						</span>
						<div className={`rounded-lg border px-4 py-3 ${meta.className}`}>
							<div className="flex flex-wrap items-center gap-2 mb-1.5">
								<Badge
									variant="outline"
									className={`text-[10px] ${meta.className}`}
								>
									{meta.label}
								</Badge>
								{item.reviewerName && (
									<span className="text-xs font-medium">
										{item.reviewerName}
										{item.reviewerRole && (
											<span className="text-muted-foreground ml-1">
												({item.reviewerRole.toUpperCase()})
											</span>
										)}
									</span>
								)}
								<span className="text-xs text-muted-foreground ml-auto">
									{new Date(item.createdAt).toLocaleString()}
								</span>
							</div>
							{item.remark ?
								<p className="text-xs whitespace-pre-wrap">{item.remark}</p>
							:	<p className="text-xs italic text-muted-foreground">
									No remark provided.
								</p>
							}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
