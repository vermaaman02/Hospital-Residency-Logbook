/**
 * Rotation Postings screen — mobile implementation of the PG Logbook
 * "LOG OF ROTATION POSTINGS DURING POST GRADUATION IN EM" section.
 *
 * Features:
 * - Unified 3-tab view:
 *   1. Rotation Postings (list of 20 rotations + fill/edit/submit/delete)
 *   2. Thesis Topic (MD thesis topic details + semester 1-6 committee records)
 *   3. Training & Mentoring Record (5-domain rating progress bars + evaluation comments)
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
	Linking,
	Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { differenceInDays } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import {
	ArrowLeft,
	Calendar,
	Check,
	ChevronDown,
	Clock,
	FileEdit,
	GraduationCap,
	RefreshCw,
	Send,
	Trash2,
	User,
	X,
	AlertTriangle,
	BookOpen,
	Target,
	Info,
	History,
	Plus,
	Download,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import {
	Badge,
	Button,
	Card,
	Divider,
	Heading,
	HStack,
	IconBubble,
	Input,
	Screen,
	SectionHeader,
	StatusBadge,
	Text,
	VStack,
} from "@/components/ui";
import {
	useRotationPostings,
	ROTATION_POSTINGS,
	RotationPosting,
	RotationPostingStatus,
	FacultyOption,
} from "@/lib/hooks/useRotationPostings";
import { useThesis, Thesis, ThesisSemesterRecord } from "@/lib/hooks/useThesis";
import { useTrainingMentoring, TrainingRecord } from "@/lib/hooks/useTrainingMentoring";
import { Colors, Radius, Spacing, Layout } from "@/lib/theme";
import { apiClient } from "@/lib/api/client";

type FormState = {
	startDate: Date | null;
	endDate: Date | null;
	totalDuration: string;
	facultyId: string;
};

const SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

const SCORE_DESCRIPTIONS: Record<number, string> = {
	5: "Exceptional — Far exceeds expectations",
	4: "Exceeds — Above expected standard",
	3: "Meets — Performs at expected standard",
	2: "Inconsistent — Below expectations in some areas",
	1: "Requires Remedial — Needs significant improvement",
};

function calcDuration(start: Date | null, end: Date | null): string {
	if (!start || !end) return "";
	const days = differenceInDays(end, start);
	if (days < 0) return "Invalid";
	if (days < 7) return `${days} day${days !== 1 ? "s" : ""}`;
	if (days < 30) {
		const weeks = Math.floor(days / 7);
		const rem = days % 7;
		return rem > 0 ? `${weeks}w ${rem}d` : `${weeks} week${weeks !== 1 ? "s" : ""}`;
	}
	const months = Math.floor(days / 30);
	const rem = days % 30;
	return rem > 0 ? `${months}m ${rem}d` : `${months} month${months !== 1 ? "s" : ""}`;
}

function formatDate(date: string | Date | null): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatValue(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (typeof v === "string") {
		if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
			const d = new Date(v);
			if (!Number.isNaN(d.getTime())) {
				return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
			}
		}
		return v;
	}
	if (typeof v === "boolean" || typeof v === "number") return String(v);
	if (Array.isArray(v)) return v.length === 0 ? "[]" : `[${v.length} item(s)]`;
	return JSON.stringify(v);
}

function diffSnapshots(
	prev: Record<string, any> | null,
	curr: Record<string, any> | null,
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
			if (after !== null && after !== undefined && after !== "") {
				out.push({ field: key, before: null, after, isNew: true });
			}
		} else if (beforeStr !== afterStr) {
			out.push({ field: key, before, after, isNew: false });
		}
	}
	return out.sort((a, b) => a.field.localeCompare(b.field));
}

const ProgressBar = ({ score }: { score: number | null }) => {
	const val = score ?? 0;
	const percentage = `${(val / 5) * 100}%`;
	return (
		<View style={styles.progressBarBg}>
			<View style={[styles.progressBarFill, { width: percentage as any }]} />
		</View>
	);
};

export default function RotationPostingsScreen() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"rotations" | "thesis" | "training">("rotations");

	// ─── HOOKS ──────────────────────────────────────────────────────────
	const {
		postingsByName,
		facultyList,
		corePostings,
		electivePostings,
		stats,
		isLoading: isPostingsLoading,
		refetch: refetchPostings,
		isCreating,
		isUpdating,
		isSubmitting,
		isDeleting,
		isAddingAttachment,
		isRemovingAttachment,
		createPosting,
		updatePosting,
		submitPosting,
		deletePosting,
		addAttachment,
		removeAttachment,
	} = useRotationPostings();

	const {
		thesis,
		isLoading: isThesisLoading,
		refetch: refetchThesis,
		updateThesis,
		submitThesis,
		upsertSemester,
		submitSemester,
		isUpdatingThesis,
		isSubmittingThesis,
		isUpsertingSemester,
		isSubmittingSemester,
	} = useThesis();

	const {
		records: trainingRecords,
		isLoading: isTrainingLoading,
		refetch: refetchTraining,
	} = useTrainingMentoring();

	const isLoading = isPostingsLoading || isThesisLoading || isTrainingLoading;

	const handleRefresh = useCallback(() => {
		refetchPostings();
		refetchThesis();
		refetchTraining();
	}, [refetchPostings, refetchThesis, refetchTraining]);

	// ─── STATE FOR ROTATION POSTINGS ──────────────────────────────────────
	const [editingSlNo, setEditingSlNo] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>({
		startDate: null,
		endDate: null,
		totalDuration: "",
		facultyId: "",
	});
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
	const autoDuration = useMemo(() => calcDuration(form.startDate, form.endDate), [form.startDate, form.endDate]);

	// Filter state for Rotations
	const [rotationFilter, setRotationFilter] = useState<"all" | "core" | "elective" | "pending" | "signed" | "draft">("all");

	// ─── STATE FOR THESIS TOPIC ───────────────────────────────────────────
	const [isThesisEditing, setIsThesisEditing] = useState(false);
	const [thesisTopic, setThesisTopic] = useState("");
	const [thesisChiefGuide, setThesisChiefGuide] = useState("");
	const [showThesisFacultyDropdown, setShowThesisFacultyDropdown] = useState(false);

	// Sync thesis details form when data loads
	useEffect(() => {
		if (thesis) {
			setThesisTopic(thesis.topic ?? "");
			setThesisChiefGuide(thesis.chiefGuide ?? "");
			setIsThesisEditing(!thesis.topic);
		}
	}, [thesis]);

	// ─── STATE FOR THESIS SEMESTERS ───────────────────────────────────────
	const [editingSemester, setEditingSemester] = useState<number | null>(null);
	const [semSrJrMember, setSemSrJrMember] = useState("");
	const [semSrMember, setSemSrMember] = useState("");
	const [semFacultyMember, setSemFacultyMember] = useState("");
	const [showSemFacultyDropdown, setShowSemFacultyDropdown] = useState(false);

	// ─── STATE FOR HISTORY MODAL ──────────────────────────────────────────
	const [historyPostingId, setHistoryPostingId] = useState<string | null>(null);
	const [historyPostingName, setHistoryPostingName] = useState("");
	const [historyRevisions, setHistoryRevisions] = useState<any[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	// ─── FILE UPLOAD STATE ────────────────────────────────────────────────
	const [isUploadingFile, setIsUploadingFile] = useState(false);

	// ─── ROTATION ACTIONS ────────────────────────────────────────────────
	const startEditing = useCallback((slNo: number, posting?: RotationPosting) => {
		if (posting && (posting.status === "SUBMITTED" || posting.status === "SIGNED")) return;
		setEditingSlNo(slNo);
		setForm({
			startDate: posting?.startDate ? new Date(posting.startDate) : null,
			endDate: posting?.endDate ? new Date(posting.endDate) : null,
			totalDuration: posting?.totalDuration ?? "",
			facultyId: posting?.facultyId ?? "",
		});
	}, []);

	const cancelEditing = () => {
		setEditingSlNo(null);
		setShowFacultyDropdown(false);
	};

	const validateForm = (): string[] => {
		const errors: string[] = [];
		if (!form.startDate) errors.push("Start date is required");
		if (!form.endDate) errors.push("End date is required");
		if (!form.totalDuration.trim() && !autoDuration) errors.push("Duration is required");
		if (!form.facultyId) errors.push("Faculty is required");
		return errors;
	};

	const handleSave = async (rotationName: string, existingId?: string) => {
		const errors = validateForm();
		if (errors.length > 0) {
			Alert.alert("Validation Error", errors.join("\n"));
			return;
		}

		const data = {
			rotationName,
			startDate: form.startDate!,
			endDate: form.endDate!,
			totalDuration: form.totalDuration || autoDuration,
			facultyId: form.facultyId,
		};

		try {
			if (existingId) {
				await updatePosting({ ...data, id: existingId });
				Alert.alert("Success", "Rotation posting updated");
			} else {
				await createPosting(data);
				Alert.alert("Success", "Rotation posting created");
			}
			setEditingSlNo(null);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save");
		}
	};

	const handleSubmit = (posting: RotationPosting) => {
		const missing: string[] = [];
		if (!posting.startDate) missing.push("Start Date");
		if (!posting.endDate) missing.push("End Date");
		if (!posting.totalDuration) missing.push("Duration");
		if (!posting.facultyId) missing.push("Faculty");
		if (missing.length > 0) {
			Alert.alert("Cannot Submit", `Please fill: ${missing.join(", ")}`);
			return;
		}

		Alert.alert(
			"Submit for Review",
			"This will submit your rotation posting for faculty review. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Submit",
					style: "default",
					onPress: async () => {
						try {
							await submitPosting(posting.id);
							Alert.alert("Success", "Submitted for review");
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to submit");
						}
					},
				},
			],
		);
	};

	const handleDelete = (posting: RotationPosting) => {
		Alert.alert(
			"Delete Draft",
			"Are you sure you want to delete this draft?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await deletePosting(posting.id);
							setEditingSlNo(null);
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to delete");
						}
					},
				},
			],
		);
	};

	const getFacultyName = (id: string | null) => {
		if (!id) return "—";
		const f = facultyList.find((f) => f.id === id);
		return f ? `${f.firstName} ${f.lastName}` : "—";
	};

	const onDateChange = (field: "startDate" | "endDate", event: DateTimePickerEvent, date?: Date) => {
		if (field === "startDate") setShowStartPicker(false);
		else setShowEndPicker(false);
		if (date) {
			setForm((prev) => ({ ...prev, [field]: date }));
		}
	};

	// ─── CLOUDINARY UPLOAD ACTIONS ───────────────────────────────────────
	const handleUploadAttachment = async (postingId: string) => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Permission Denied", "We need camera roll permissions to upload attachments.");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 0.8,
		});

		if (result.canceled || !result.assets || result.assets.length === 0) {
			return;
		}

		const selectedUri = result.assets[0].uri;

		try {
			setIsUploadingFile(true);

			// 1. Get Cloudinary signature from API
			const { data: signRes } = await apiClient.post("/api/v1/cloudinary-sign", {
				folder: "rotation_postings",
			});

			if (!signRes.ok || !signRes.data) {
				throw new Error("Failed to get upload signature");
			}

			const { signature, timestamp, apiKey, cloudName, folder } = signRes.data;

			// 2. Upload file to Cloudinary
			const formData = new FormData();
			const uriParts = selectedUri.split(".");
			const fileType = uriParts[uriParts.length - 1];

			formData.append("file", {
				uri: selectedUri,
				name: `upload.${fileType}`,
				type: `image/${fileType}`,
			} as any);
			formData.append("api_key", apiKey);
			formData.append("timestamp", timestamp.toString());
			formData.append("signature", signature);
			formData.append("folder", folder);

			const uploadResponse = await fetch(
				`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
				{
					method: "POST",
					body: formData,
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (!uploadResponse.ok) {
				const errorData = await uploadResponse.json();
				throw new Error(errorData.error?.message || "Upload to Cloudinary failed");
			}

			const uploadData = await uploadResponse.json();
			const secureUrl = uploadData.secure_url;

			// 3. Save to database
			await addAttachment({ id: postingId, attachmentUrl: secureUrl });
			Alert.alert("Success", "Attachment uploaded successfully!");
		} catch (e: any) {
			Alert.alert("Upload Error", e?.message || "Failed to upload attachment");
		} finally {
			setIsUploadingFile(false);
		}
	};

	const handleRemoveAttachment = async (postingId: string, url: string) => {
		Alert.alert(
			"Delete Attachment",
			"Are you sure you want to remove this attachment?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						try {
							await removeAttachment({ id: postingId, attachmentUrl: url });
							Alert.alert("Success", "Attachment removed");
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to remove attachment");
						}
					},
				},
			]
		);
	};

	// ─── REVISION HISTORY ACTIONS ─────────────────────────────────────────
	const handleViewHistory = async (postingId: string, rotationName: string) => {
		setHistoryPostingId(postingId);
		setHistoryPostingName(rotationName);
		setIsLoadingHistory(true);
		try {
			const { data: res } = await apiClient.get("/api/v1/entry-revisions", {
				params: {
					entityType: "RotationPosting",
					entityId: postingId,
				},
			});
			if (res.ok) {
				setHistoryRevisions(res.data || []);
			} else {
				setHistoryRevisions([]);
			}
		} catch (e: any) {
			console.error("Failed to load history", e);
			setHistoryRevisions([]);
		} finally {
			setIsLoadingHistory(false);
		}
	};

	// Helper to format values with faculty name resolution
	const formatValueWithResolution = (
		fieldName: string,
		value: unknown,
	): string => {
		if (fieldName === "facultyId" && typeof value === "string") {
			return getFacultyName(value);
		}
		return formatValue(value);
	};

	// Pre-compute processed revisions with submission numbers and diffs (same as web RevisionThread)
	const processedRevisions = useMemo(() => {
		let prevSubmission: Record<string, any> | null = null;
		let submissionCount = 0;

		const hideSet = new Set(["id", "userId", "rotationPostingId", "createdAt", "updatedAt"]);

		return historyRevisions.map((item) => {
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
	}, [historyRevisions]);

	// ─── THESIS TOPIC ACTIONS ────────────────────────────────────────────
	const handleSaveThesisDetails = async () => {
		if (!thesisTopic.trim()) {
			Alert.alert("Validation Error", "Thesis topic is required");
			return;
		}

		try {
			await updateThesis({
				topic: thesisTopic,
				chiefGuide: thesisChiefGuide || undefined,
			});
			Alert.alert("Success", "Thesis details saved");
			setIsThesisEditing(false);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save");
		}
	};

	const handleSubmitThesisTopic = async () => {
		if (!thesis) return;
		Alert.alert(
			"Submit Thesis",
			"This will submit your thesis details for review. You won't be able to edit them unless revised. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Submit",
					style: "default",
					onPress: async () => {
						try {
							await submitThesis(thesis.id);
							Alert.alert("Success", "Thesis submitted for review");
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to submit");
						}
					},
				},
			],
		);
	};

	// ─── THESIS SEMESTER ACTIONS ──────────────────────────────────────────
	const startEditingSemester = (sem: number, record?: ThesisSemesterRecord) => {
		if (record && (record.status === "SUBMITTED" || record.status === "SIGNED")) return;
		setEditingSemester(sem);
		setSemSrJrMember(record?.srJrMember ?? "");
		setSemSrMember(record?.srMember ?? "");
		setSemFacultyMember(record?.facultyMember ?? "");
	};

	const handleSaveSemesterRecord = async () => {
		if (!thesis || editingSemester === null) return;

		try {
			await upsertSemester({
				thesisId: thesis.id,
				semester: editingSemester,
				srJrMember: semSrJrMember || null,
				srMember: semSrMember || null,
				facultyMember: semFacultyMember || null,
			});
			Alert.alert("Success", `Semester ${editingSemester} record saved`);
			setEditingSemester(null);
			setShowSemFacultyDropdown(false);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save record");
		}
	};

	const handleSubmitSemesterRecord = (record: ThesisSemesterRecord) => {
		if (!record.srJrMember && !record.srMember && !record.facultyMember) {
			Alert.alert("Cannot Submit", "Please fill in at least one committee member before submitting");
			return;
		}

		Alert.alert(
			"Submit Semester Record",
			`This will submit the committee record for Semester ${record.semester}. Continue?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Submit",
					style: "default",
					onPress: async () => {
						try {
							await submitSemester(record.id);
							Alert.alert("Success", `Semester ${record.semester} submitted for review`);
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to submit");
						}
					},
				},
			],
		);
	};

	// ─── RENDERS ────────────────────────────────────────────────────────
	const renderAttachmentSection = (posting: RotationPosting, canModify: boolean) => {
		const attachments = posting.attachments || [];
		if (attachments.length === 0 && !canModify) return null;

		return (
			<VStack gap="1.5" style={styles.attachmentsSection}>
				<Text variant="bodySm" color={Colors.muted} style={styles.attachmentsLabel}>Attachments</Text>
				{attachments.map((url, i) => {
					const displayBaseName = `Attachment ${i + 1}`;
					return (
						<HStack key={url} justify="space-between" align="center" style={styles.attachmentItem}>
							<Pressable onPress={() => Linking.openURL(url)} style={styles.flex1} hitSlop={8}>
								<HStack gap="1.5" align="center">
									<Download size={14} color={Colors.accent} />
									<Text variant="bodySm" color={Colors.accent} numberOfLines={1}>
										{displayBaseName}
									</Text>
								</HStack>
							</Pressable>
							{canModify && (
								<Pressable onPress={() => handleRemoveAttachment(posting.id, url)} hitSlop={8}>
									<X size={14} color={Colors.danger} />
								</Pressable>
							)}
						</HStack>
					);
				})}
				{canModify && (
					<Button
						label={isUploadingFile ? "Uploading..." : "Upload Image Attachment"}
						variant="ghost"
						size="sm"
						leftIcon={<Plus size={14} color={Colors.accent} />}
						onPress={() => handleUploadAttachment(posting.id)}
						loading={isUploadingFile}
						style={{ alignSelf: "flex-start", marginTop: Spacing["1"] }}
					/>
				)}
			</VStack>
		);
	};

	const renderRotationCard = (rotation: typeof ROTATION_POSTINGS[number], isElective: boolean) => {
		const posting = postingsByName.get(rotation.name);
		const isEditing = editingSlNo === rotation.slNo;
		const canEdit = posting
			? posting.status === "DRAFT" || posting.status === "NEEDS_REVISION"
			: true;
		const showRemark = posting?.status === "NEEDS_REVISION" && posting?.facultyRemark;

		if (isEditing) {
			return (
				<Card
					key={rotation.slNo}
					variant="featured-violet"
					style={styles.editCard}
				>
					<VStack gap="3">
						<HStack gap="2" align="center">
							<IconBubble
								tone="accent"
								size={36}
								icon={<Text variant="bodyStrong" color={Colors.inverse}>{rotation.slNo}</Text>}
							/>
							<VStack gap="0.5" style={styles.flex1}>
								<Text variant="bodyStrong" numberOfLines={2}>{rotation.name}</Text>
								{isElective && <Badge label="Elective" tone="warning" />}
							</VStack>
						</HStack>

						<Divider />

						{/* Date Pickers */}
						<HStack gap="3">
							<View style={styles.flex1}>
								<Pressable
									onPress={() => setShowStartPicker(true)}
									style={styles.dateButton}
								>
									<HStack gap="2" align="center">
										<Calendar size={16} color={Colors.muted} />
										<Text variant="body" color={form.startDate ? Colors.foreground : Colors.muted}>
											{form.startDate ? formatDate(form.startDate) : "Start Date"}
										</Text>
									</HStack>
								</Pressable>
							</View>
							<View style={styles.flex1}>
								<Pressable
									onPress={() => setShowEndPicker(true)}
									style={styles.dateButton}
								>
									<HStack gap="2" align="center">
										<Calendar size={16} color={Colors.muted} />
										<Text variant="body" color={form.endDate ? Colors.foreground : Colors.muted}>
											{form.endDate ? formatDate(form.endDate) : "End Date"}
										</Text>
									</HStack>
								</Pressable>
							</View>
						</HStack>

						{showStartPicker && (
							<DateTimePicker
								value={form.startDate || new Date()}
								mode="date"
								onChange={(e, d) => onDateChange("startDate", e, d)}
							/>
						)}
						{showEndPicker && (
							<DateTimePicker
								value={form.endDate || new Date()}
								mode="date"
								onChange={(e, d) => onDateChange("endDate", e, d)}
							/>
						)}

						{/* Duration */}
						<Input
							label="Duration"
							placeholder={autoDuration || "e.g. 4 weeks"}
							value={form.totalDuration}
							onChangeText={(text) => setForm((p) => ({ ...p, totalDuration: text }))}
							hint={autoDuration && !form.totalDuration ? `Auto: ${autoDuration}` : undefined}
						/>

						{/* Faculty Dropdown - Rendered INLINE within the Card to avoid Android overflow touch interception bugs */}
						<View>
							<Text variant="label" color={Colors.muted}>Faculty</Text>
							<Pressable
								onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
								style={styles.facultyDropdown}
							>
								<HStack justify="space-between" align="center">
									<Text variant="body" color={form.facultyId ? Colors.foreground : Colors.muted}>
										{getFacultyName(form.facultyId) || "Select Faculty"}
									</Text>
									<ChevronDown size={16} color={Colors.muted} />
								</HStack>
							</Pressable>
							{showFacultyDropdown && (
								<View style={styles.facultyListInline}>
									<ScrollView style={styles.facultyScroll} nestedScrollEnabled>
										{facultyList.map((f) => (
											<Pressable
												key={f.id}
												onPress={() => {
													setForm((p) => ({ ...p, facultyId: f.id }));
													setShowFacultyDropdown(false);
												}}
												style={({ pressed }) => [
													styles.facultyItem,
													pressed && { backgroundColor: Colors.backgroundAlt },
												]}
											>
												<Text variant="body">{f.firstName} {f.lastName}</Text>
											</Pressable>
										))}
									</ScrollView>
								</View>
							)}
						</View>

						{/* Attachments Section in Edit Mode */}
						{posting && renderAttachmentSection(posting, true)}

						{/* Actions */}
						<HStack gap="2" justify="flex-end">
							<Button
								label="Cancel"
								variant="ghost"
								size="sm"
								onPress={cancelEditing}
								leftIcon={<X size={14} color={Colors.muted} />}
							/>
							{posting?.status === "DRAFT" && (
								<Button
									label="Delete"
									variant="ghost"
									size="sm"
									onPress={() => handleDelete(posting)}
									loading={isDeleting}
									leftIcon={<Trash2 size={14} color={Colors.danger} />}
								/>
							)}
							<Button
								label="Save"
								variant="primary"
								size="sm"
								onPress={() => handleSave(rotation.name, posting?.id)}
								loading={isCreating || isUpdating}
								leftIcon={<Check size={14} color={Colors.inverse} />}
							/>
						</HStack>
					</VStack>
				</Card>
			);
		}

		// Read-only card
		return (
			<Pressable
				key={rotation.slNo}
				onPress={() => canEdit && startEditing(rotation.slNo, posting)}
				disabled={!canEdit}
			>
				<Card
					style={StyleSheet.flatten([
						styles.readCard,
						!canEdit ? styles.disabledCard : undefined,
						posting?.status === "SIGNED" ? styles.signedCard : undefined,
					])}
				>
					<VStack gap="2">
						<HStack gap="3" align="center" justify="space-between">
							<HStack gap="2" align="center" style={styles.flex1}>
								<IconBubble
									tone={isElective ? "warning" : "accent"}
									size={32}
									icon={<Text variant="bodyStrong" color={Colors.inverse}>{rotation.slNo}</Text>}
								/>
								<VStack gap="0.5" style={styles.flex1}>
									<Text variant="bodyStrong" numberOfLines={2}>{rotation.name}</Text>
									{posting ? (
										<StatusBadge status={posting.status as any} />
									) : (
										<Text variant="bodySm" color={Colors.muted}>Not filled — Tap to add</Text>
									)}
								</VStack>
							</HStack>
						</HStack>

						{posting && (
							<VStack gap="1" style={styles.details}>
								<HStack gap="2" align="center">
									<Calendar size={14} color={Colors.muted} />
									<Text variant="bodySm">
										{formatDate(posting.startDate)} — {formatDate(posting.endDate)}
									</Text>
								</HStack>
								<HStack gap="2" align="center">
									<Clock size={14} color={Colors.muted} />
									<Text variant="bodySm">{posting.totalDuration || "—"}</Text>
								</HStack>
								<HStack gap="2" align="center">
									<User size={14} color={Colors.muted} />
									<Text variant="bodySm">{getFacultyName(posting.facultyId)}</Text>
								</HStack>
							</VStack>
						)}

						{/* Attachments Section in Read Only */}
						{posting && renderAttachmentSection(posting, posting.status === "DRAFT" || posting.status === "NEEDS_REVISION")}

						{showRemark && (
							<View style={styles.remarkBox}>
								<HStack gap="2" align="flex-start">
									<AlertTriangle size={16} color={Colors.amber} />
									<VStack gap="0.5" style={styles.flex1}>
										<Text variant="bodySm" color={Colors.amber}>Revision Required</Text>
										<Text variant="bodySm">{posting.facultyRemark}</Text>
									</VStack>
								</HStack>
							</View>
						)}

						{posting && (
							<HStack gap="2" justify="flex-end" style={styles.actions}>
								{/* History Button */}
								<Button
									label="History"
									variant="ghost"
									size="sm"
									leftIcon={<History size={14} color={Colors.muted} />}
									onPress={() => handleViewHistory(posting.id, rotation.name)}
								/>

								{canEdit && (posting.status === "DRAFT" || posting.status === "NEEDS_REVISION") && (
									<Button
										label="Submit"
										variant="secondary"
										size="sm"
										onPress={() => handleSubmit(posting)}
										loading={isSubmitting}
										leftIcon={<Send size={14} color={Colors.accent} />}
									/>
								)}
							</HStack>
						)}
					</VStack>
				</Card>
			</Pressable>
		);
	};

	const renderThesisTab = () => {
		if (!thesis) return null;

		const thesisStatus = thesis.status || "DRAFT";
		const isLocked = thesisStatus === "SUBMITTED" || thesisStatus === "SIGNED";
		const canSubmit = thesisTopic.trim().length > 0 && (thesisStatus === "DRAFT" || thesisStatus === "NEEDS_REVISION");

		return (
			<VStack gap="4" style={styles.tabContent}>
				{thesisStatus === "NEEDS_REVISION" && thesis.facultyRemark && (
					<View style={[styles.remarkBox, { borderLeftWidth: 4, borderLeftColor: Colors.amber }]}>
						<HStack gap="2" align="flex-start">
							<AlertTriangle size={18} color={Colors.amber} />
							<VStack gap="0.5" style={styles.flex1}>
								<Text variant="bodyStrong" color={Colors.amber}>Revision Required</Text>
								<Text variant="bodySm">{thesis.facultyRemark}</Text>
							</VStack>
						</HStack>
					</View>
				)}

				{/* Thesis Details Card */}
				<Card>
					<VStack gap="3">
						<HStack justify="space-between" align="center">
							<HStack gap="2" align="center">
								<GraduationCap size={20} color={Colors.accent} />
								<Heading level={4}>Thesis Details</Heading>
							</HStack>
							<StatusBadge status={thesisStatus as any} />
						</HStack>

						<Divider />

						{isThesisEditing && !isLocked ? (
							<VStack gap="3">
								<Input
									label="Thesis Topic *"
									placeholder="Enter your thesis topic..."
									value={thesisTopic}
									onChangeText={setThesisTopic}
									multiline
									style={{ height: 80, textAlignVertical: "top" }}
								/>

								<View>
									<Text variant="label" color={Colors.muted}>Chief Guide</Text>
									<Pressable
										onPress={() => setShowThesisFacultyDropdown(!showThesisFacultyDropdown)}
										style={styles.facultyDropdown}
									>
										<HStack justify="space-between" align="center">
											<Text variant="body" color={thesisChiefGuide ? Colors.foreground : Colors.muted}>
												{thesisChiefGuide || "Select chief guide"}
											</Text>
											<ChevronDown size={16} color={Colors.muted} />
										</HStack>
									</Pressable>
									{showThesisFacultyDropdown && (
										<View style={styles.facultyListInline}>
											<ScrollView style={styles.facultyScroll} nestedScrollEnabled>
												<Pressable
													onPress={() => {
														setThesisChiefGuide("");
														setShowThesisFacultyDropdown(false);
													}}
													style={({ pressed }) => [
														styles.facultyItem,
														pressed && { backgroundColor: Colors.backgroundAlt },
													]}
												>
													<Text variant="body" color={Colors.muted}>Not assigned</Text>
												</Pressable>
												{facultyList.map((f) => {
													const fullName = `${f.firstName} ${f.lastName}`;
													return (
														<Pressable
															key={f.id}
															onPress={() => {
																setThesisChiefGuide(fullName);
																setShowThesisFacultyDropdown(false);
															}}
															style={({ pressed }) => [
																styles.facultyItem,
																pressed && { backgroundColor: Colors.backgroundAlt },
															]}
														>
															<Text variant="body">{fullName}</Text>
														</Pressable>
													);
												})}
											</ScrollView>
										</View>
									)}
								</View>

								<HStack gap="2" justify="flex-end">
									{thesis.topic && (
										<Button
											label="Cancel"
											variant="ghost"
											size="sm"
											onPress={() => {
												setThesisTopic(thesis.topic ?? "");
												setThesisChiefGuide(thesis.chiefGuide ?? "");
												setIsThesisEditing(false);
											}}
										/>
									)}
									<Button
										label="Save"
										variant="primary"
										size="sm"
										onPress={handleSaveThesisDetails}
										loading={isUpdatingThesis}
										leftIcon={<Check size={14} color={Colors.inverse} />}
									/>
								</HStack>
							</VStack>
						) : (
							<VStack gap="3">
								<VStack gap="1">
									<Text variant="bodySm" color={Colors.muted}>Topic:</Text>
									<Text variant="bodyStrong">{thesis.topic || "Not set yet"}</Text>
								</VStack>
								<VStack gap="1">
									<Text variant="bodySm" color={Colors.muted}>Chief Guide:</Text>
									<Text variant="bodyStrong">{thesis.chiefGuide || "Not assigned"}</Text>
								</VStack>

								{!isLocked && (
									<HStack gap="2" justify="flex-end">
										<Button
											label="Edit"
											variant="secondary"
											size="sm"
											onPress={() => setIsThesisEditing(true)}
											leftIcon={<FileEdit size={14} color={Colors.foreground} />}
										/>
										{canSubmit && (
											<Button
												label="Submit"
												variant="primary"
												size="sm"
												onPress={handleSubmitThesisTopic}
												loading={isSubmittingThesis}
												leftIcon={<Send size={14} color={Colors.inverse} />}
											/>
										)}
									</HStack>
								)}
							</VStack>
						)}
					</VStack>
				</Card>

				{/* Semester Committee Section */}
				<VStack gap="2">
					<HStack gap="2" align="center" style={{ marginTop: Spacing["2"] }}>
						<BookOpen size={18} color={Colors.accent} />
						<Heading level={4}>Semester-wise Thesis Committee</Heading>
					</HStack>
					<Text variant="bodySm" color={Colors.muted}>
						Fill each semester's committee and submit individually for review
					</Text>

					{SEMESTERS.map((sem) => {
						const record = thesis.semesterRecords.find((r) => r.semester === sem);
						const isSemEditing = editingSemester === sem;
						const hasData = record?.srJrMember || record?.srMember || record?.facultyMember;
						const semStatus = record?.status ?? "DRAFT";
						const semLocked = semStatus === "SUBMITTED" || semStatus === "SIGNED";
						const canSubmitSem = hasData && (semStatus === "DRAFT" || semStatus === "NEEDS_REVISION");
						const showSemRemark = semStatus === "NEEDS_REVISION" && record?.facultyRemark;

						if (isSemEditing) {
							return (
								<Card key={sem} variant="featured-violet" style={styles.editCard}>
									<VStack gap="3">
										<Heading level={4} color={Colors.accent}>Semester {sem} Record</Heading>
										<Divider />

										<Input
											label="SR/JR Member"
											placeholder="SR/JR member name"
											value={semSrJrMember}
											onChangeText={setSemSrJrMember}
										/>

										<Input
											label="SR Member"
											placeholder="SR member name"
											value={semSrMember}
											onChangeText={setSemSrMember}
										/>

										<View>
											<Text variant="label" color={Colors.muted}>Faculty Member</Text>
											<Pressable
												onPress={() => setShowSemFacultyDropdown(!showSemFacultyDropdown)}
												style={styles.facultyDropdown}
											>
												<HStack justify="space-between" align="center">
													<Text variant="body" color={semFacultyMember ? Colors.foreground : Colors.muted}>
														{semFacultyMember || "Select faculty member"}
													</Text>
													<ChevronDown size={16} color={Colors.muted} />
												</HStack>
											</Pressable>
											{showSemFacultyDropdown && (
												<View style={styles.facultyListInline}>
													<ScrollView style={styles.facultyScroll} nestedScrollEnabled>
														<Pressable
															onPress={() => {
																setSemFacultyMember("");
																setShowSemFacultyDropdown(false);
															}}
															style={({ pressed }) => [
																styles.facultyItem,
																pressed && { backgroundColor: Colors.backgroundAlt },
															]}
														>
															<Text variant="body" color={Colors.muted}>None</Text>
														</Pressable>
														{facultyList.map((f) => {
															const fullName = `${f.firstName} ${f.lastName}`;
															return (
																<Pressable
																	key={f.id}
																	onPress={() => {
																		setSemFacultyMember(fullName);
																		setShowSemFacultyDropdown(false);
																	}}
																	style={({ pressed }) => [
																		styles.facultyItem,
																		pressed && { backgroundColor: Colors.backgroundAlt },
																	]}
																>
																	<Text variant="body">{fullName}</Text>
																</Pressable>
															);
														})}
													</ScrollView>
												</View>
											)}
										</View>

										<HStack gap="2" justify="flex-end">
											<Button
												label="Cancel"
												variant="ghost"
												size="sm"
												onPress={() => {
													setEditingSemester(null);
													setShowSemFacultyDropdown(false);
												}}
											/>
											<Button
												label="Save"
												variant="primary"
												size="sm"
												onPress={handleSaveSemesterRecord}
												loading={isUpsertingSemester}
												leftIcon={<Check size={14} color={Colors.inverse} />}
											/>
										</HStack>
									</VStack>
								</Card>
							);
						}

						return (
							<Card key={sem} style={semStatus === "SIGNED" ? styles.signedCard : undefined}>
								<VStack gap="3">
									<HStack justify="space-between" align="center">
										<Text variant="bodyStrong">Semester {sem}</Text>
										{record ? (
											<StatusBadge status={semStatus as any} />
										) : (
											<Badge label="Not filled" tone="neutral" />
										)}
									</HStack>

									{record && (
										<VStack gap="2" style={{ paddingLeft: Spacing["2"] }}>
											<HStack gap="2" align="center">
												<User size={13} color={Colors.muted} />
												<Text variant="bodySm" color={Colors.foregroundSoft}>
													SR/JR Member: <Text variant="bodyStrong">{record.srJrMember || "—"}</Text>
												</Text>
											</HStack>
											<HStack gap="2" align="center">
												<User size={13} color={Colors.muted} />
												<Text variant="bodySm" color={Colors.foregroundSoft}>
													SR Member: <Text variant="bodyStrong">{record.srMember || "—"}</Text>
												</Text>
											</HStack>
											<HStack gap="2" align="center">
												<User size={13} color={Colors.muted} />
												<Text variant="bodySm" color={Colors.foregroundSoft}>
													Faculty Member: <Text variant="bodyStrong">{record.facultyMember || "—"}</Text>
												</Text>
											</HStack>

											{showSemRemark && (
												<View style={styles.remarkBox}>
													<HStack gap="2" align="flex-start">
														<AlertTriangle size={15} color={Colors.amber} />
														<VStack gap="0.5" style={styles.flex1}>
															<Text variant="bodySm" color={Colors.amber}>Revision Required</Text>
															<Text variant="bodySm">{record.facultyRemark}</Text>
														</VStack>
													</HStack>
												</View>
											)}
										</VStack>
									)}

									{!semLocked && (
										<HStack gap="2" justify="flex-end" style={{ marginTop: Spacing["1"] }}>
											<Button
												label={record ? "Edit" : "Fill Details"}
												variant="secondary"
												size="sm"
												onPress={() => startEditingSemester(sem, record)}
												leftIcon={<FileEdit size={12} color={Colors.foreground} />}
											/>
											{record && canSubmitSem && (
												<Button
													label="Submit"
													variant="secondary"
													size="sm"
													onPress={() => handleSubmitSemesterRecord(record)}
													loading={isSubmittingSemester}
													leftIcon={<Send size={12} color={Colors.accent} />}
												/>
											)}
										</HStack>
									)}
								</VStack>
							</Card>
						);
					})}
				</VStack>
			</VStack>
		);
	};

	const renderTrainingTab = () => {
		return (
			<VStack gap="4" style={styles.tabContent}>
				{/* Training Intro Card */}
				<Card>
					<VStack gap="3">
						<HStack gap="2" align="center">
							<Target size={20} color={Colors.accent} />
							<Heading level={4}>Resident Training & Mentoring Record</Heading>
						</HStack>
						<Text variant="bodySm" color={Colors.muted}>
							5-domain evaluation scored 1-5 per semester by your faculty mentor
						</Text>

						<View style={[styles.infoBox, { backgroundColor: Colors.infoSoft }]}>
							<HStack gap="2" align="flex-start">
								<Info size={16} color={Colors.info} style={{ marginTop: 2 }} />
								<VStack gap="0.5" style={styles.flex1}>
									<Text variant="bodyStrong" color={Colors.infoForeground}>
										This section is evaluated by your faculty mentor
									</Text>
									<Text variant="bodySm" color={Colors.infoForeground}>
										Scores are entered by assigned faculty during periodic reviews. You can view your progress here.
									</Text>
								</VStack>
							</HStack>
						</View>

						<Divider />

						<Heading level={4}>Score Scale Legend</Heading>
						<VStack gap="1.5">
							{Object.entries(SCORE_DESCRIPTIONS).reverse().map(([score, desc]) => (
								<HStack key={score} gap="2" align="center">
									<View style={styles.legendDot}>
										<Text variant="bodyStrong" color={Colors.inverse}>{score}</Text>
									</View>
									<Text variant="bodySm" color={Colors.foregroundSoft}>{desc}</Text>
								</HStack>
							))}
						</VStack>
					</VStack>
				</Card>

				{/* Semester Evaluation list */}
				<VStack gap="3">
					<Heading level={4} style={{ marginTop: Spacing["2"] }}>Semester Evaluations</Heading>

					{SEMESTERS.map((sem) => {
						const record = trainingRecords.find((r) => r.semester === sem);

						if (record) {
							const evaluator = getFacultyName(record.evaluatedById);
							return (
								<Card key={sem} style={record.status === "SIGNED" ? styles.signedCard : undefined}>
									<VStack gap="3">
										<HStack justify="space-between" align="center">
											<HStack gap="2" align="center">
												<Heading level={4}>Semester {sem}</Heading>
												<StatusBadge status={record.status as any} />
											</HStack>
											<View style={styles.overallBadge}>
												<Text variant="label" color={Colors.muted} style={{ fontSize: 9 }}>OVERALL</Text>
												<Text variant="h3" color={Colors.accent}>{record.overallScore ?? "—"}</Text>
											</View>
										</HStack>

										<Divider />

										{/* Scores */}
										<VStack gap="2">
											<HStack justify="space-between" align="center" gap="3">
												<Text variant="bodySm" style={{ width: 110 }}>Knowledge</Text>
												<ProgressBar score={record.knowledgeScore} />
												<Text variant="bodyStrong" style={{ width: 16, textAlign: "right" }}>{record.knowledgeScore ?? "—"}</Text>
											</HStack>
											<HStack justify="space-between" align="center" gap="3">
												<Text variant="bodySm" style={{ width: 110 }}>Clinical Skills</Text>
												<ProgressBar score={record.clinicalSkillScore} />
												<Text variant="bodyStrong" style={{ width: 16, textAlign: "right" }}>{record.clinicalSkillScore ?? "—"}</Text>
											</HStack>
											<HStack justify="space-between" align="center" gap="3">
												<Text variant="bodySm" style={{ width: 110 }}>Procedural Skills</Text>
												<ProgressBar score={record.proceduralSkillScore} />
												<Text variant="bodyStrong" style={{ width: 16, textAlign: "right" }}>{record.proceduralSkillScore ?? "—"}</Text>
											</HStack>
											<HStack justify="space-between" align="center" gap="3">
												<Text variant="bodySm" style={{ width: 110 }}>Soft Skills</Text>
												<ProgressBar score={record.softSkillScore} />
												<Text variant="bodyStrong" style={{ width: 16, textAlign: "right" }}>{record.softSkillScore ?? "—"}</Text>
											</HStack>
											<HStack justify="space-between" align="center" gap="3">
												<Text variant="bodySm" style={{ width: 110 }}>Research</Text>
												<ProgressBar score={record.researchScore} />
												<Text variant="bodyStrong" style={{ width: 16, textAlign: "right" }}>{record.researchScore ?? "—"}</Text>
											</HStack>
										</VStack>

										<Divider />

										<VStack gap="1.5">
											<HStack gap="1.5" align="center">
												<User size={13} color={Colors.muted} />
												<Text variant="bodySm" color={Colors.muted}>
													Evaluator: <Text variant="bodyStrong" color={Colors.foregroundSoft}>{evaluator}</Text>
												</Text>
											</HStack>
											{record.remarks ? (
												<VStack gap="0.5" style={styles.remarksBlock}>
													<Text variant="bodyStrong" color={Colors.muted}>Remarks:</Text>
													<Text variant="bodySm" color={Colors.foreground}>{record.remarks}</Text>
												</VStack>
											) : null}
										</VStack>
									</VStack>
								</Card>
							);
						}

						return (
							<Card key={sem} style={styles.disabledCard}>
								<VStack gap="2" align="center" style={{ paddingVertical: Spacing["2"] }}>
									<HStack justify="space-between" align="center" style={{ width: "100%" }}>
										<Text variant="bodyStrong" color={Colors.muted}>Semester {sem} Evaluation</Text>
										<Badge label="Unfilled" tone="neutral" />
									</HStack>
									<Text variant="bodySm" color={Colors.muted} style={{ textAlign: "center", marginTop: Spacing["1"] }}>
										No evaluation record yet. Your faculty mentor will add scores during reviews.
									</Text>
								</VStack>
							</Card>
						);
					})}
				</VStack>
			</VStack>
		);
	};

	const allRotations = [...corePostings, ...electivePostings];

	// Filtered rotations memoized
	const filteredRotations = useMemo(() => {
		return allRotations.filter((r) => {
			const posting = postingsByName.get(r.name);
			if (rotationFilter === "all") return true;
			if (rotationFilter === "core") return !r.isElective;
			if (rotationFilter === "elective") return r.isElective;
			if (rotationFilter === "pending") return posting?.status === "SUBMITTED";
			if (rotationFilter === "signed") return posting?.status === "SIGNED";
			if (rotationFilter === "draft") return posting?.status === "DRAFT" || posting?.status === "NEEDS_REVISION";
			return true;
		});
	}, [allRotations, postingsByName, rotationFilter]);

	return (
		<Screen bleed scroll={activeTab !== "rotations"}>
			{/* Static Header Section */}
			<View style={styles.header}>
				<HStack gap="3" align="center" style={styles.headerRow}>
					<Pressable onPress={() => router.back()} hitSlop={12}>
						<ArrowLeft size={22} color={Colors.foreground} strokeWidth={2.5} />
					</Pressable>
					<Heading level={2}>Rotation Postings</Heading>
				</HStack>

				{/* Segmented Control / Tabs */}
				<HStack gap="2" style={styles.tabsContainer}>
					<Pressable
						style={[styles.tabButton, activeTab === "rotations" && styles.activeTabButton]}
						onPress={() => {
							setActiveTab("rotations");
							cancelEditing();
						}}
					>
						<Text variant="bodyStrong" color={activeTab === "rotations" ? Colors.inverse : Colors.foreground} style={styles.tabText}>
							Rotations
						</Text>
					</Pressable>
					<Pressable
						style={[styles.tabButton, activeTab === "thesis" && styles.activeTabButton]}
						onPress={() => {
							setActiveTab("thesis");
							setEditingSemester(null);
						}}
					>
						<Text variant="bodyStrong" color={activeTab === "thesis" ? Colors.inverse : Colors.foreground} style={styles.tabText}>
							Thesis Topic
						</Text>
					</Pressable>
					<Pressable
						style={[styles.tabButton, activeTab === "training" && styles.activeTabButton]}
						onPress={() => {
							setActiveTab("training");
						}}
					>
						<Text variant="bodyStrong" color={activeTab === "training" ? Colors.inverse : Colors.foreground} style={styles.tabText}>
							Training
						</Text>
					</Pressable>
				</HStack>
			</View>

			{/* Tab Contents */}
			{activeTab === "rotations" ? (
				<FlatList
					data={filteredRotations}
					keyExtractor={(item) => item.slNo.toString()}
					ListHeaderComponent={
						<View style={styles.tabContent}>
							<SectionHeader
								title="Log of Rotation Postings"
								subtitle="7 core + 13 elective postings as per NMC guidelines"
							/>

							{/* Stats */}
							<Card variant="featured-violet" style={styles.statsCard}>
								<HStack justify="space-between">
									<VStack gap="0.5" align="center">
										<Text variant="h3">{stats.coreFilled}/7</Text>
										<Text variant="bodySm" color={Colors.muted}>Core</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3">{stats.electiveFilled}/13</Text>
										<Text variant="bodySm" color={Colors.muted}>Elective</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3" color={Colors.success}>{stats.signed}</Text>
										<Text variant="bodySm" color={Colors.muted}>Signed</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3" color={Colors.warning}>{stats.pending}</Text>
										<Text variant="bodySm" color={Colors.muted}>Pending</Text>
									</VStack>
								</HStack>
							</Card>

							{/* Scrollable Filter Chips */}
							<VStack gap="2" style={{ marginBottom: Spacing["3"] }}>
								<Text variant="label" color={Colors.muted}>Filter Postings</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
									{(
										[
											{ key: "all", label: "All" },
											{ key: "core", label: "Core" },
											{ key: "elective", label: "Electives" },
											{ key: "draft", label: "Draft/Revision" },
											{ key: "pending", label: "Pending" },
											{ key: "signed", label: "Signed" },
										] as const
									).map((filter) => {
										const isActive = rotationFilter === filter.key;
										return (
											<Pressable
												key={filter.key}
												onPress={() => setRotationFilter(filter.key)}
												style={[styles.filterChip, isActive && styles.activeFilterChip]}
												hitSlop={8}
											>
												<Text variant="bodyStrong" color={isActive ? Colors.inverse : Colors.foreground}>
													{filter.label}
												</Text>
											</Pressable>
										);
									})}
								</ScrollView>
							</VStack>

							<Divider />
							<Text variant="bodyStrong" style={styles.sectionTitle}>
								{rotationFilter === "all" ? "Core Postings" : `${rotationFilter.toUpperCase()} List`}
							</Text>
						</View>
					}
					renderItem={({ item, index }) => {
						// Show elective header after core postings (only in 'all' filter mode)
						if (rotationFilter === "all" && index === 7) {
							return (
								<View style={styles.tabContent}>
									<Text variant="bodyStrong" style={[styles.sectionTitle, styles.electiveTitle]}>
										Elective Postings
									</Text>
									{renderRotationCard(item, item.isElective)}
								</View>
							);
						}
						return <View style={styles.tabContent}>{renderRotationCard(item, item.isElective)}</View>;
					}}
					contentContainerStyle={styles.list}
					ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
					refreshControl={
						<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.accent} />
					}
				/>
			) : (
				<ScrollView
					style={styles.scrollContainer}
					contentContainerStyle={styles.scrollList}
					refreshControl={
						<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.accent} />
					}
				>
					{activeTab === "thesis" ? renderThesisTab() : renderTrainingTab()}
				</ScrollView>
			)}

			{/* Timeline Revision History Modal */}
			<Modal
				visible={historyPostingId !== null}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setHistoryPostingId(null)}
			>
				<View style={styles.modalOverlay}>
					{/* Standard clean white card with rounded border (no featured shadow block to avoid overflow/clipping) */}
					<View style={styles.modalCard}>
						<VStack gap="3">
							<HStack justify="space-between" align="center">
								<VStack gap="0.5" style={styles.flex1}>
									<Heading level={4}>Revision History</Heading>
									<Text variant="bodySm" color={Colors.muted} numberOfLines={2}>{historyPostingName}</Text>
								</VStack>
								<Pressable onPress={() => setHistoryPostingId(null)} hitSlop={12} style={styles.modalCloseButton}>
									<X size={20} color={Colors.foreground} />
								</Pressable>
							</HStack>
							<Divider />
							
							{isLoadingHistory ? (
								<View style={styles.centerPadded}>
									<RefreshCw size={24} color={Colors.accent} style={styles.spinIcon} />
									<Text variant="muted" style={{ marginTop: Spacing["2"] }}>Loading revisions...</Text>
								</View>
							) : historyRevisions.length === 0 ? (
								<View style={styles.centerPadded}>
									<Info size={24} color={Colors.muted} />
									<Text variant="muted" style={{ marginTop: Spacing["2"], textAlign: "center" }}>
										No revision history for this rotation.
									</Text>
								</View>
							) : (
								<View style={styles.timelineContainer}>
									<View style={styles.timelineVerticalLine} />
									<ScrollView style={styles.historyListScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
										<VStack gap="3" style={{ paddingVertical: Spacing["1"] }}>
											{processedRevisions.map((rev, idx) => {
												const dateStr = formatDate(rev.createdAt);
												const isSubmission = rev.kind === "SUBMISSION";
												
												// Decision styling details matching the web version
												let eventTitle = "Submitted for Review";
												let cardBg = "#EEF2F6"; // Slate tint for submission
												let borderC = "#CBD5E1";
												let textC = "#334155";
												let dotBg: string = Colors.accent;

												if (!isSubmission) {
													if (rev.decision === "SIGNED") {
														eventTitle = "Approved & Signed";
														cardBg = "#E8F5E9"; // Success soft green
														borderC = "#A5D6A7";
														textC = "#2E7D32";
														dotBg = Colors.success;
													} else if (rev.decision === "NEEDS_REVISION") {
														eventTitle = "Revision Requested";
														cardBg = "#FFF8E1"; // Warning soft yellow
														borderC = "#FFE082";
														textC = "#F57F17";
														dotBg = Colors.warning;
													} else {
														eventTitle = "Rejected";
														cardBg = "#FFEBEE"; // Danger soft red
														borderC = "#EF9A9A";
														textC = "#C62828";
														dotBg = Colors.danger;
													}
												}

												const diff = isSubmission ? (rev as any).diff || [] : [];
												const subNum = isSubmission ? (rev as any).submissionNumber : 0;

												return (
													<View key={rev.id || idx} style={styles.historyItemRow}>
														{/* Timeline Dot */}
														<View style={styles.timelineDotContainer}>
															<View style={[styles.timelineDot, { backgroundColor: dotBg }]} />
														</View>

														{/* Revision Card */}
														<View style={[styles.historyCard, { backgroundColor: cardBg, borderColor: borderC }]}>
															<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["1.5"] }}>
																{isSubmission ? (
																	<Badge
																		label={`Submission #${subNum}`}
																		tone="accent"
																	/>
																) : (
																	<Badge
																		label={eventTitle}
																		tone={rev.decision === "SIGNED" ? "success" : rev.decision === "NEEDS_REVISION" ? "warning" : "danger"}
																	/>
																)}
																<Text variant="bodySm" color={Colors.muted}>{dateStr}</Text>
															</HStack>

															{!isSubmission && rev.reviewer && (
																<Text variant="bodyStrong" color={textC} style={{ marginBottom: Spacing["1"] }}>
																	{rev.reviewer.firstName} {rev.reviewer.lastName}
																	<Text variant="bodySm" color={Colors.muted}> ({rev.reviewer.role.toUpperCase()})</Text>
																</Text>
															)}

															{isSubmission && (
																<VStack gap="1" style={{ marginTop: Spacing["1"] }}>
																	<Text variant="bodyStrong" color={textC}>
																		{subNum === 1 ? "Submitted fields:" : "Changes since previous submission:"}
																	</Text>
																	{diff.length === 0 ? (
																		<Text variant="bodySm" color={Colors.muted} style={{ fontStyle: "italic" }}>
																			No field-level changes recorded.
																		</Text>
																	) : (
																		diff.map((d: any) => (
																			<HStack key={d.field} gap="2" style={styles.diffRow}>
																				<Text variant="mono" style={styles.diffField}>{d.field}:</Text>
																				{d.isNew ? (
																					<Text variant="mono" color={Colors.success} style={styles.flex1}>
																						{formatValueWithResolution(d.field, d.after)}
																					</Text>
																				) : (
																					<Text variant="mono" style={styles.flex1}>
																						<Text color={Colors.danger} style={{ textDecorationLine: "line-through" }}>
																							{formatValueWithResolution(d.field, d.before)}
																						</Text>
																						{" → "}
																						<Text color={Colors.success}>
																							{formatValueWithResolution(d.field, d.after)}
																						</Text>
																					</Text>
																				)}
																			</HStack>
																		))
																	)}
																	{rev.attachments && rev.attachments.length > 0 && (
																		<Text variant="bodySm" color={Colors.muted} style={{ marginTop: Spacing["1.5"] }}>
																			📎 {rev.attachments.length} attachment(s)
																		</Text>
																	)}
																</VStack>
															)}

															{!isSubmission && rev.remark && (
																<View style={styles.historyRemarkContainer}>
																	<Text variant="bodySm" color={textC}>{rev.remark}</Text>
																</View>
															)}
														</View>
													</View>
												);
											})}
										</VStack>
									</ScrollView>
								</View>
							)}
						</VStack>
					</View>
				</View>
			</Modal>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: {
		paddingHorizontal: Layout.screenPadding,
		paddingTop: Spacing["4"],
		paddingBottom: Spacing["2"],
	},
	headerRow: {
		paddingVertical: Spacing["3"],
	},
	tabsContainer: {
		marginTop: Spacing["3"],
		marginBottom: Spacing["1"],
	},
	tabButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing["3"],
		borderRadius: Radius.md,
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surface,
	},
	activeTabButton: {
		backgroundColor: Colors.accent,
		borderColor: Colors.borderStrong,
	},
	tabText: {
		fontSize: 12,
	},
	tabContent: {
		paddingHorizontal: Layout.screenPadding,
	},
	scrollContainer: {
		flex: 1,
	},
	scrollList: {
		paddingBottom: Spacing["12"],
	},
	statsCard: {
		marginTop: Spacing["4"],
		marginBottom: Spacing["4"],
	},
	filtersScroll: {
		gap: Spacing["2"],
		paddingRight: Spacing["4"],
	},
	filterChip: {
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["1.5"],
		borderRadius: Radius.pill,
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surface,
	},
	activeFilterChip: {
		backgroundColor: Colors.accent,
	},
	sectionTitle: {
		marginTop: Spacing["4"],
		marginBottom: Spacing["2"],
	},
	electiveTitle: {
		marginTop: Spacing["6"],
		marginBottom: Spacing["2"],
	},
	list: {
		paddingBottom: Spacing["12"],
	},
	readCard: {
		padding: Spacing["4"],
	},
	disabledCard: {
		opacity: 0.7,
		backgroundColor: Colors.surface,
	},
	signedCard: {
		borderLeftWidth: 4,
		borderLeftColor: Colors.success,
	},
	editCard: {
		padding: Spacing["4"],
		borderWidth: 2,
		borderColor: Colors.accent,
	},
	flex1: {
		flex: 1,
	},
	details: {
		paddingLeft: Spacing["10"],
		marginTop: Spacing["2"],
	},
	actions: {
		marginTop: Spacing["2"],
	},
	remarkBox: {
		backgroundColor: Colors.amber + "20",
		padding: Spacing["3"],
		borderRadius: Radius.md,
		marginTop: Spacing["2"],
	},
	infoBox: {
		padding: Spacing["3"],
		borderRadius: Radius.md,
		marginTop: Spacing["1"],
	},
	dateButton: {
		borderWidth: 2,
		borderColor: Colors.inputBorder,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.inputBg,
	},
	facultyDropdown: {
		borderWidth: 2,
		borderColor: Colors.inputBorder,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.inputBg,
	},
	facultyListInline: {
		marginTop: Spacing["2"],
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		backgroundColor: Colors.surface,
		maxHeight: 180,
		overflow: "hidden",
	},
	facultyScroll: {
		maxHeight: 176,
	},
	facultyItem: {
		paddingVertical: Spacing["3"],
		paddingHorizontal: Spacing["3"],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	attachmentsSection: {
		marginTop: Spacing["3"],
		padding: Spacing["3"],
		backgroundColor: Colors.backgroundAlt,
		borderRadius: Radius.md,
		borderWidth: 1.5,
		borderColor: Colors.border,
	},
	attachmentsLabel: {
		letterSpacing: 0.4,
	},
	attachmentItem: {
		backgroundColor: Colors.surface,
		paddingVertical: Spacing["2"],
		paddingHorizontal: Spacing["3"],
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	legendDot: {
		height: 20,
		width: 20,
		borderRadius: Radius.pill,
		backgroundColor: Colors.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	overallBadge: {
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["1"],
		backgroundColor: Colors.surface,
	},
	progressBarBg: {
		height: 8,
		backgroundColor: Colors.border,
		borderRadius: Radius.pill,
		overflow: "hidden",
		marginTop: Spacing["1"],
		flex: 1,
	},
	progressBarFill: {
		height: "100%",
		backgroundColor: Colors.accent,
		borderRadius: Radius.pill,
	},
	remarksBlock: {
		backgroundColor: Colors.backgroundAlt,
		padding: Spacing["2"],
		borderRadius: Radius.sm,
		marginTop: Spacing["1"],
	},
	// Modal and History Timeline styles
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.overlay,
		justifyContent: "center",
		alignItems: "center",
		padding: Layout.screenPadding,
	},
	modalCard: {
		backgroundColor: Colors.surface,
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.lg,
		padding: Spacing["5"],
		width: "90%",
		maxHeight: "80%",
	},
	modalCloseButton: {
		padding: Spacing["1"],
	},
	centerPadded: {
		paddingVertical: Spacing["6"],
		alignItems: "center",
		justifyContent: "center",
	},
	spinIcon: {
		width: 24,
		height: 24,
	},
	timelineContainer: {
		position: "relative",
		paddingLeft: Spacing["5"],
		marginTop: Spacing["2"],
	},
	timelineVerticalLine: {
		position: "absolute",
		left: 5,
		top: 10,
		bottom: 10,
		width: 2,
		backgroundColor: Colors.border,
	},
	historyListScroll: {
		maxHeight: 380,
	},
	historyItemRow: {
		position: "relative",
		paddingLeft: Spacing["3"],
		marginBottom: Spacing["4"],
	},
	timelineDotContainer: {
		position: "absolute",
		left: -20,
		top: 16,
		zIndex: 99,
		alignItems: "center",
		justifyContent: "center",
	},
	timelineDot: {
		width: 10,
		height: 10,
		borderRadius: Radius.pill,
		borderWidth: 2,
		borderColor: Colors.surface,
	},
	historyCard: {
		borderWidth: 1.5,
		borderRadius: Radius.md,
		padding: Spacing["3"],
	},
	historyRemarkContainer: {
		backgroundColor: "rgba(255, 255, 255, 0.6)",
		padding: Spacing["2"],
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: "rgba(0, 0, 0, 0.05)",
		marginTop: Spacing["1.5"],
	},
	diffRow: {
		marginTop: 2,
	},
	diffField: {
		width: 110,
		color: Colors.muted,
		fontSize: 11,
	},
});
