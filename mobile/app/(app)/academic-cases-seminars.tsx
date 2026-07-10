/**
 * Academic Case Presentations & Seminars screen — mobile implementation of the PG Logbook.
 * Handles two tabs:
 * 1. Case Presentations (Target: 20 entries)
 * 2. Seminars (Target: 10 entries)
 */

import React, { useState, useCallback, useMemo } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
	ArrowLeft,
	Calendar,
	Check,
	ChevronDown,
	FileEdit,
	Trash2,
	User,
	X,
	AlertTriangle,
	Plus,
	Send,
	History,
	Info,
	Download,
	RefreshCw,
} from "lucide-react-native";

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
	ExportButton,
} from "@/components/ui";
import { useCasePresentations, CasePresentation, CasePresentationInput, PatientCategory } from "@/lib/hooks/useCasePresentations";
import { useSeminars, Seminar, SeminarInput } from "@/lib/hooks/useSeminars";
import { useRotationPostings } from "@/lib/hooks/useRotationPostings";
import { Colors, Radius, Spacing, Layout } from "@/lib/theme";
import { apiClient } from "@/lib/api/client";

type FormState = {
	date: Date | null;
	patientName: string;
	patientAge: string;
	patientSex: "Male" | "Female" | "Other" | "";
	uhid: string;
	completeDiagnosis: string;
	category: PatientCategory | "";
	facultyId: string;
};

const INITIAL_FORM: FormState = {
	date: null,
	patientName: "",
	patientAge: "",
	patientSex: "",
	uhid: "",
	completeDiagnosis: "",
	category: "",
	facultyId: "",
};

const CATEGORY_LABELS: Record<PatientCategory, string> = {
	ADULT_TRAUMA: "Adult / Trauma",
	ADULT_NON_TRAUMA: "Adult / Non-Trauma",
	PEDIATRIC_TRAUMA: "Pediatric / Trauma",
	PEDIATRIC_NON_TRAUMA: "Pediatric / Non-Trauma",
	OTHER: "Other",
};

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

export default function AcademicCasesSeminarsScreen() {
	const router = useRouter();
	const { tab } = useLocalSearchParams<{ tab?: "cases" | "seminars" }>();
	const [activeTab, setActiveTab] = useState<"cases" | "seminars">("cases");

	React.useEffect(() => {
		if (tab === "cases" || tab === "seminars") {
			setActiveTab(tab);
		}
	}, [tab]);

	// ─── HOOKS ──────────────────────────────────────────────────────────
	const { facultyList } = useRotationPostings();
	const {
		cases,
		isLoading: isCasesLoading,
		refetch: refetchCases,
		createCase,
		updateCase,
		submitCase,
		deleteCase,
		isCreating: isCreatingCase,
		isUpdating: isUpdatingCase,
		isSubmitting: isSubmittingCase,
		isDeleting: isDeletingCase,
	} = useCasePresentations();

	const {
		seminars,
		isLoading: isSeminarsLoading,
		refetch: refetchSeminars,
		createSeminar,
		updateSeminar,
		submitSeminar,
		deleteSeminar,
		isCreating: isCreatingSem,
		isUpdating: isUpdatingSem,
		isSubmitting: isSubmittingSem,
		isDeleting: isDeletingSem,
	} = useSeminars();

	const isLoading = isCasesLoading || isSeminarsLoading;

	const handleRefresh = useCallback(() => {
		refetchCases();
		refetchSeminars();
	}, [refetchCases, refetchSeminars]);

	// ─── FORM & EDIT STATES ──────────────────────────────────────────────
	const [editingId, setEditingId] = useState<string | null>(null); // cuid or "new"
	const [form, setForm] = useState<FormState>(INITIAL_FORM);
	const [showDatePicker, setShowDatePicker] = useState(false);

	// Inline Dropdown Toggles (Android touch scroll fix)
	const [showSexDropdown, setShowSexDropdown] = useState(false);
	const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
	const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

	const isDropdownOpen = showSexDropdown || showCategoryDropdown || showFacultyDropdown;

	// ─── HISTORY STATE ───────────────────────────────────────────────────
	const [historyId, setHistoryId] = useState<string | null>(null);
	const [historyName, setHistoryName] = useState("");
	const [historyRevisions, setHistoryRevisions] = useState<any[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	// Filter state
	const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending" | "signed">("draft");
	const [lastComputedKey, setLastComputedKey] = useState<string>("");

	// Automatically default the filter to "draft" if drafts exist, else "all"
	React.useEffect(() => {
		const list = activeTab === "cases" ? cases : seminars;
		const key = `${activeTab}-${list.length}`;
		if (key !== lastComputedKey && list.length > 0) {
			const hasDrafts = list.some(
				(item) => item.status === "DRAFT" || item.status === "NEEDS_REVISION"
			);
			setStatusFilter(hasDrafts ? "draft" : "all");
			setLastComputedKey(key);
		}
	}, [activeTab, cases, seminars, lastComputedKey]);

	// ─── UTILITIES ──────────────────────────────────────────────────────
	const getFacultyName = (id: string | null) => {
		if (!id) return "—";
		const f = facultyList.find((f) => f.id === id);
		return f ? `${f.firstName} ${f.lastName}` : "—";
	};

	const formatCategory = (cat: PatientCategory | null) => {
		if (!cat) return "—";
		return CATEGORY_LABELS[cat] || cat;
	};

	const startEditing = (entry?: CasePresentation | Seminar) => {
		if (entry) {
			setEditingId(entry.id);
			setForm({
				date: entry.date ? new Date(entry.date) : null,
				patientName: entry.patientName || "",
				patientAge: entry.patientAge || "",
				patientSex: entry.patientSex || "",
				uhid: entry.uhid || "",
				completeDiagnosis: entry.completeDiagnosis || "",
				category: entry.category || "",
				facultyId: entry.facultyId || "",
			});
		} else {
			setEditingId("new");
			setForm(INITIAL_FORM);
		}
		// Reset dropdowns
		setShowSexDropdown(false);
		setShowCategoryDropdown(false);
		setShowFacultyDropdown(false);
	};

	const cancelEditing = () => {
		setEditingId(null);
		setForm(INITIAL_FORM);
	};

	const validateForm = (): string[] => {
		const errors: string[] = [];
		if (!form.date) errors.push("Date is required");
		if (!form.patientName.trim()) errors.push("Patient name is required");
		if (!form.patientAge.trim()) errors.push("Age is required");
		if (!form.patientSex) errors.push("Sex is required");
		if (!form.uhid.trim()) errors.push("UHID is required");
		if (!form.completeDiagnosis.trim()) errors.push("Complete diagnosis is required");
		if (!form.category) errors.push("Category is required");
		if (!form.facultyId) errors.push("Faculty signature is required");
		return errors;
	};

	// ─── SAVE / SUBMIT / DELETE ─────────────────────────────────────────
	const handleSave = async () => {
		const errors = validateForm();
		if (errors.length > 0) {
			Alert.alert("Validation Error", errors.join("\n"));
			return;
		}

		const payload: CasePresentationInput | SeminarInput = {
			date: form.date!,
			patientName: form.patientName,
			patientAge: form.patientAge,
			patientSex: form.patientSex || null,
			uhid: form.uhid,
			completeDiagnosis: form.completeDiagnosis,
			category: form.category || null,
			facultyId: form.facultyId,
		};

		try {
			if (activeTab === "cases") {
				if (editingId === "new") {
					await createCase(payload);
					Alert.alert("Success", "Case Presentation created");
				} else {
					await updateCase({ id: editingId!, data: payload });
					Alert.alert("Success", "Case Presentation updated");
				}
			} else {
				if (editingId === "new") {
					await createSeminar(payload);
					Alert.alert("Success", "Seminar Discussion created");
				} else {
					await updateSeminar({ id: editingId!, data: payload });
					Alert.alert("Success", "Seminar Discussion updated");
				}
			}
			setEditingId(null);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save");
		}
	};

	const handleSubmit = (id: string) => {
		Alert.alert(
			"Submit for Review",
			"This will submit your entry for review. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Submit",
					onPress: async () => {
						try {
							if (activeTab === "cases") {
								await submitCase(id);
							} else {
								await submitSeminar(id);
							}
							Alert.alert("Success", "Submitted for review");
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to submit");
						}
					},
				},
			]
		);
	};

	const handleDelete = (id: string) => {
		Alert.alert(
			"Delete Draft",
			"Are you sure you want to delete this draft entry?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							if (activeTab === "cases") {
								await deleteCase(id);
							} else {
								await deleteSeminar(id);
							}
							cancelEditing();
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to delete");
						}
					},
				},
			]
		);
	};

	// ─── REVISION HISTORY ACTIONS ─────────────────────────────────────────
	const handleViewHistory = async (id: string, name: string) => {
		setHistoryId(id);
		setHistoryName(name);
		setIsLoadingHistory(true);
		try {
			const type = activeTab === "cases" ? "CasePresentation" : "Seminar";
			const { data: res } = await apiClient.get("/api/v1/entry-revisions", {
				params: {
					entityType: type,
					entityId: id,
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

	const formatValueWithResolution = (fieldName: string, value: unknown): string => {
		if (fieldName === "facultyId" && typeof value === "string") {
			return getFacultyName(value);
		}
		if (fieldName === "category" && typeof value === "string") {
			return formatCategory(value as PatientCategory);
		}
		return formatValue(value);
	};

	const processedRevisions = useMemo(() => {
		let prevSubmission: Record<string, any> | null = null;
		let submissionCount = 0;
		const hideSet = new Set(["id", "userId", "slNo", "createdAt", "updatedAt"]);

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

	// ─── TAB FILTERING & COMPUTATIONS ──────────────────────────────────
	const currentList = activeTab === "cases" ? cases : seminars;

	// Filtered and sorted list
	const filteredAndSortedList = useMemo(() => {
		const filtered = currentList.filter((item) => {
			if (statusFilter === "all") return true;
			if (statusFilter === "draft") return item.status === "DRAFT" || item.status === "NEEDS_REVISION";
			if (statusFilter === "pending") return item.status === "SUBMITTED";
			if (statusFilter === "signed") return item.status === "SIGNED";
			return true;
		});

		return [...filtered].sort((a, b) => {
			const getPriority = (status: string) => {
				if (status === "DRAFT" || status === "NEEDS_REVISION") return 1;
				if (status === "SUBMITTED") return 2;
				if (status === "SIGNED") return 3;
				return 4;
			};
			const priA = getPriority(a.status);
			const priB = getPriority(b.status);
			if (priA !== priB) return priA - priB;
			// Secondary sort: newest slNo first (descending)
			return b.slNo - a.slNo;
		});
	}, [currentList, statusFilter]);

	// Compute stats
	const stats = useMemo(() => {
		const total = currentList.length;
		const signed = currentList.filter((c) => c.status === "SIGNED").length;
		const pending = currentList.filter((c) => c.status === "SUBMITTED").length;
		const needsRev = currentList.filter((c) => c.status === "NEEDS_REVISION").length;
		const target = activeTab === "cases" ? 20 : 10;
		return { total, signed, pending, needsRev, target };
	}, [currentList, activeTab]);

	// ─── RENDERS ────────────────────────────────────────────────────────
	const renderEditForm = () => {
		const isNew = editingId === "new";
		const isSaving = isCreatingCase || isUpdatingCase || isCreatingSem || isUpdatingSem;

		return (
			<Card variant="featured-violet" style={styles.editCard}>
				<VStack gap="3">
					<Heading level={4} color={Colors.accent}>
						{isNew ? "Insert New Row" : `Edit Row #${form.patientName}`}
					</Heading>

					<Divider />

					{/* Date picker */}
					<View>
						<Text variant="label" color={Colors.muted}>Date *</Text>
						<Pressable
							onPress={() => setShowDatePicker(true)}
							style={styles.formButton}
						>
							<HStack gap="2" align="center">
								<Calendar size={16} color={Colors.muted} />
								<Text variant="body" color={form.date ? Colors.foreground : Colors.muted}>
									{form.date ? formatDate(form.date) : "Select Date"}
								</Text>
							</HStack>
						</Pressable>
						{showDatePicker && (
							<DateTimePicker
								value={form.date || new Date()}
								mode="date"
								onValueChange={(e, d) => {
									setShowDatePicker(false);
									if (d) setForm((p) => ({ ...p, date: d }));
								}}
							/>
						)}
					</View>

					{/* Patient Name */}
					<Input
						label="Patient Name *"
						placeholder="Patient Name"
						value={form.patientName}
						onChangeText={(t) => setForm((p) => ({ ...p, patientName: t }))}
					/>

					{/* Age & Sex */}
					<HStack gap="3">
						<View style={styles.flex1}>
							<Input
								label="Age *"
								placeholder="e.g. 24"
								value={form.patientAge}
								onChangeText={(t) => setForm((p) => ({ ...p, patientAge: t }))}
							/>
						</View>
						<View style={styles.flex1}>
							<Text variant="label" color={Colors.muted}>Sex *</Text>
							<Pressable
								onPress={() => setShowSexDropdown(!showSexDropdown)}
								style={styles.formButton}
							>
								<HStack justify="space-between" align="center">
									<Text variant="body" color={form.patientSex ? Colors.foreground : Colors.muted}>
										{form.patientSex || "Select Sex"}
									</Text>
									<ChevronDown size={16} color={Colors.muted} />
								</HStack>
							</Pressable>
							{showSexDropdown && (
								<View style={styles.dropdownInline}>
									{(["Male", "Female", "Other"] as const).map((sex) => (
										<Pressable
											key={sex}
											onPress={() => {
												setForm((p) => ({ ...p, patientSex: sex }));
												setShowSexDropdown(false);
											}}
											style={({ pressed }) => [
												styles.dropdownItem,
												pressed && { backgroundColor: Colors.backgroundAlt },
											]}
										>
											<Text variant="body">{sex}</Text>
										</Pressable>
									))}
								</View>
							)}
						</View>
					</HStack>

					{/* UHID */}
					<Input
						label="UHID *"
						placeholder="UHID"
						value={form.uhid}
						onChangeText={(t) => setForm((p) => ({ ...p, uhid: t }))}
					/>

					{/* Category Select */}
					<View>
						<Text variant="label" color={Colors.muted}>Category *</Text>
						<Pressable
							onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
							style={styles.formButton}
						>
							<HStack justify="space-between" align="center">
								<Text variant="body" color={form.category ? Colors.foreground : Colors.muted}>
									{form.category ? formatCategory(form.category) : "Select Category"}
								</Text>
								<ChevronDown size={16} color={Colors.muted} />
							</HStack>
						</Pressable>
						{showCategoryDropdown && (
							<View style={styles.dropdownInline}>
								{(
									[
										"ADULT_TRAUMA",
										"ADULT_NON_TRAUMA",
										"PEDIATRIC_TRAUMA",
										"PEDIATRIC_NON_TRAUMA",
										"OTHER",
									] as const
								).map((cat) => (
									<Pressable
										key={cat}
										onPress={() => {
											setForm((p) => ({ ...p, category: cat }));
											setShowCategoryDropdown(false);
										}}
										style={({ pressed }) => [
											styles.dropdownItem,
											pressed && { backgroundColor: Colors.backgroundAlt },
										]}
									>
										<Text variant="body">{formatCategory(cat)}</Text>
									</Pressable>
								))}
							</View>
						)}
					</View>

					{/* Complete Diagnosis */}
					<Input
						label="Complete Diagnosis *"
						placeholder="Complete Diagnosis"
						value={form.completeDiagnosis}
						onChangeText={(t) => setForm((p) => ({ ...p, completeDiagnosis: t }))}
						multiline
						style={{ height: 60, textAlignVertical: "top" }}
					/>

					{/* Faculty Signature Select */}
					<View>
						<Text variant="label" color={Colors.muted}>Faculty Signature *</Text>
						<Pressable
							onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
							style={styles.formButton}
						>
							<HStack justify="space-between" align="center">
								<Text variant="body" color={form.facultyId ? Colors.foreground : Colors.muted}>
									{getFacultyName(form.facultyId) || "Select Faculty"}
								</Text>
								<ChevronDown size={16} color={Colors.muted} />
							</HStack>
						</Pressable>
						{showFacultyDropdown && (
							<View style={styles.dropdownInline}>
								<ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
									{facultyList.map((f) => (
										<Pressable
											key={f.id}
											onPress={() => {
												setForm((p) => ({ ...p, facultyId: f.id }));
												setShowFacultyDropdown(false);
											}}
											style={({ pressed }) => [
												styles.dropdownItem,
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

					{/* Actions */}
					<HStack gap="2" justify="flex-end" style={{ marginTop: Spacing["2"] }}>
						<Button
							label="Cancel"
							variant="ghost"
							size="sm"
							onPress={cancelEditing}
							leftIcon={<X size={14} color={Colors.muted} />}
						/>
						{!isNew && (
							<Button
								label="Delete"
								variant="ghost"
								size="sm"
								onPress={() => handleDelete(editingId!)}
								loading={isDeletingCase || isDeletingSem}
								leftIcon={<Trash2 size={14} color={Colors.danger} />}
							/>
						)}
						<Button
							label="Save"
							variant="primary"
							size="sm"
							onPress={handleSave}
							loading={isSaving}
							leftIcon={<Check size={14} color={Colors.inverse} />}
						/>
					</HStack>
				</VStack>
			</Card>
		);
	};

	const renderEntryCard = (entry: CasePresentation | Seminar) => {
		const canEdit = entry.status === "DRAFT" || entry.status === "NEEDS_REVISION";
		const showRemark = entry.status === "NEEDS_REVISION" && entry.facultyRemark;

		return (
			<Pressable
				key={entry.id}
				onPress={() => canEdit && startEditing(entry)}
				disabled={!canEdit}
			>
				<Card
					style={StyleSheet.flatten([
						styles.readCard,
						!canEdit ? styles.disabledCard : undefined,
						entry.status === "SIGNED" ? styles.signedCard : undefined,
					])}
				>
					<VStack gap="3">
						<HStack justify="space-between" align="center">
							<HStack gap="2" align="center">
								<View style={styles.slNoBadge}>
									<Text variant="bodyStrong" color={Colors.inverse}>{entry.slNo}</Text>
								</View>
								<VStack gap="0.5">
									<Text variant="bodyStrong">{entry.patientName || "—"}</Text>
									<Text variant="bodySm" color={Colors.muted}>
										{entry.patientAge || "—"} / {entry.patientSex || "—"} • UHID: {entry.uhid || "—"}
									</Text>
								</VStack>
							</HStack>
							<StatusBadge status={entry.status as any} />
						</HStack>

						<Divider style={{ marginVertical: Spacing["1"] }} />

						<VStack gap="1.5">
							<HStack gap="2">
								<Text variant="bodySm" color={Colors.muted} style={{ width: 80 }}>Date:</Text>
								<Text variant="bodySm">{formatDate(entry.date)}</Text>
							</HStack>
							<HStack gap="2">
								<Text variant="bodySm" color={Colors.muted} style={{ width: 80 }}>Category:</Text>
								<Text variant="bodySm">{formatCategory(entry.category)}</Text>
							</HStack>
							<HStack gap="2" align="flex-start">
								<Text variant="bodySm" color={Colors.muted} style={{ width: 80 }}>Diagnosis:</Text>
								<Text variant="bodySm" style={styles.flex1} numberOfLines={2}>{entry.completeDiagnosis || "—"}</Text>
							</HStack>
							<HStack gap="2">
								<Text variant="bodySm" color={Colors.muted} style={{ width: 80 }}>Faculty:</Text>
								<Text variant="bodySm" color={Colors.foregroundSoft}>{getFacultyName(entry.facultyId)}</Text>
							</HStack>
						</VStack>

						{showRemark && (
							<View style={styles.remarkBox}>
								<HStack gap="2" align="flex-start">
									<AlertTriangle size={15} color={Colors.amber} />
									<VStack gap="0.5" style={styles.flex1}>
										<Text variant="bodySm" color={Colors.amber}>Revision Required</Text>
										<Text variant="bodySm">{entry.facultyRemark}</Text>
									</VStack>
								</HStack>
							</View>
						)}

						<HStack gap="2" justify="flex-end" style={{ marginTop: Spacing["1"] }}>
							{/* History Button */}
							<Button
								label="History"
								variant="ghost"
								size="sm"
								leftIcon={<History size={14} color={Colors.muted} />}
								onPress={() => handleViewHistory(entry.id, entry.patientName || "Entry")}
							/>

							{canEdit && (entry.status === "DRAFT" || entry.status === "NEEDS_REVISION") && (
								<Button
									label="Submit"
									variant="secondary"
									size="sm"
									onPress={() => handleSubmit(entry.id)}
									loading={isSubmittingCase || isSubmittingSem}
									leftIcon={<Send size={14} color={Colors.accent} />}
								/>
							)}
						</HStack>
					</VStack>
				</Card>
			</Pressable>
		);
	};

	return (
		<Screen bleed scroll={false}>
			{/* Static Header Section */}
			<View style={styles.header}>
				<HStack gap="3" align="center" style={styles.headerRow}>
					<Pressable onPress={() => router.back()} hitSlop={12}>
						<ArrowLeft size={22} color={Colors.foreground} strokeWidth={2.5} />
					</Pressable>
					<Heading level={2}>Case Presentations & Seminars</Heading>
				</HStack>

				{/* Segmented Control / Tabs */}
				<HStack gap="2" style={styles.tabsContainer}>
					<Pressable
						style={[styles.tabButton, activeTab === "cases" && styles.activeTabButton]}
						onPress={() => {
							setActiveTab("cases");
							cancelEditing();
						}}
					>
						<Text variant="bodyStrong" color={activeTab === "cases" ? Colors.inverse : Colors.foreground} style={styles.tabText}>
							Case Presentations
						</Text>
					</Pressable>
					<Pressable
						style={[styles.tabButton, activeTab === "seminars" && styles.activeTabButton]}
						onPress={() => {
							setActiveTab("seminars");
							cancelEditing();
						}}
					>
						<Text variant="bodyStrong" color={activeTab === "seminars" ? Colors.inverse : Colors.foreground} style={styles.tabText}>
							Seminars
						</Text>
					</Pressable>
				</HStack>
			</View>

			{/* Form Mode */}
			{editingId !== null ? (
				<ScrollView style={styles.formContainer} contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
					{renderEditForm()}
				</ScrollView>
			) : (
				/* List Mode */
				<FlatList
					data={filteredAndSortedList}
					keyExtractor={(item) => item.id}
					scrollEnabled={!isDropdownOpen}
					ListHeaderComponent={
						<View style={styles.tabContent}>
							<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["2"] }}>
								<View style={{ flex: 1, marginRight: Spacing["2"] }}>
									<SectionHeader
										title={activeTab === "cases" ? "Academic Case Presentation & Discussion" : "Seminar / Evidence Based Discussion Presented"}
										subtitle={activeTab === "cases" ? "Target: 20 entries" : "Target: 10 entries"}
									/>
								</View>
								<ExportButton module={activeTab === "cases" ? "case-presentations" : "seminars"} label="Download" />
							</HStack>

							{/* Stats card */}
							<Card variant="featured-violet" style={styles.statsCard}>
								<HStack justify="space-between" align="center">
									<VStack gap="0.5" align="center">
										<Text variant="h3">{stats.total}/{stats.target}</Text>
										<Text variant="bodySm" color={Colors.muted}>Total/Target</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3" color={Colors.success}>{stats.signed}</Text>
										<Text variant="bodySm" color={Colors.muted}>Signed</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3" color={Colors.warning}>{stats.pending}</Text>
										<Text variant="bodySm" color={Colors.muted}>Pending</Text>
									</VStack>
									<VStack gap="0.5" align="center">
										<Text variant="h3" color={Colors.danger}>{stats.needsRev}</Text>
										<Text variant="bodySm" color={Colors.muted}>Revision</Text>
									</VStack>
								</HStack>
							</Card>

							{/* Insert Row button */}
							<Button
								label="Insert New Row"
								variant="primary"
								leftIcon={<Plus size={16} color={Colors.inverse} />}
								onPress={() => startEditing()}
								style={{ marginBottom: Spacing["4"] }}
							/>

							{/* Filter chips */}
							<VStack gap="2" style={{ marginBottom: Spacing["4"] }}>
								<Text variant="label" color={Colors.muted}>Filter Status</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
									{(
										[
											{ key: "all", label: "All" },
											{ key: "draft", label: "Draft/Revision" },
											{ key: "pending", label: "Pending" },
											{ key: "signed", label: "Signed" },
										] as const
									).map((filter) => {
										const isActive = statusFilter === filter.key;
										return (
											<Pressable
												key={filter.key}
												onPress={() => setStatusFilter(filter.key)}
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
						</View>
					}
					renderItem={({ item }) => (
						<View style={styles.tabContent}>{renderEntryCard(item)}</View>
					)}
					contentContainerStyle={styles.list}
					ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
					refreshControl={
						<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.accent} />
					}
				/>
			)}

			{/* Timeline Revision History Modal */}
			<Modal
				visible={historyId !== null}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setHistoryId(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<VStack gap="3">
							<HStack justify="space-between" align="center">
								<VStack gap="0.5" style={styles.flex1}>
									<Heading level={4}>Revision History</Heading>
									<Text variant="bodySm" color={Colors.muted} numberOfLines={2}>{historyName}</Text>
								</VStack>
								<Pressable onPress={() => setHistoryId(null)} hitSlop={12} style={styles.modalCloseButton}>
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
										No revision history for this entry.
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
												
												let eventTitle = "Submitted for Review";
												let cardBg = "#EEF2F6";
												let borderC = "#CBD5E1";
												let textC = "#334155";
												let dotBg: string = Colors.accent;

												if (!isSubmission) {
													if (rev.decision === "SIGNED") {
														eventTitle = "Approved & Signed";
														cardBg = "#E8F5E9";
														borderC = "#A5D6A7";
														textC = "#2E7D32";
														dotBg = Colors.success;
													} else if (rev.decision === "NEEDS_REVISION") {
														eventTitle = "Revision Requested";
														cardBg = "#FFF8E1";
														borderC = "#FFE082";
														textC = "#F57F17";
														dotBg = Colors.warning;
													} else {
														eventTitle = "Rejected";
														cardBg = "#FFEBEE";
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
	formContainer: {
		flex: 1,
		paddingHorizontal: Layout.screenPadding,
	},
	formScroll: {
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
	slNoBadge: {
		height: 32,
		width: 32,
		borderRadius: Radius.pill,
		backgroundColor: Colors.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	formButton: {
		borderWidth: 2,
		borderColor: Colors.inputBorder,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.inputBg,
		marginTop: Spacing["1"],
	},
	dropdownInline: {
		marginTop: Spacing["2"],
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		backgroundColor: Colors.surface,
		overflow: "hidden",
	},
	dropdownItem: {
		paddingVertical: Spacing["3"],
		paddingHorizontal: Spacing["3"],
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	remarkBox: {
		backgroundColor: Colors.amber + "20",
		padding: Spacing["3"],
		borderRadius: Radius.md,
		marginTop: Spacing["2"],
	},
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
