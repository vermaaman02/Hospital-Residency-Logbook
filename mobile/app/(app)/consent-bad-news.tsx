import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
	AlertTriangle,
	ArrowLeft,
	Calendar as CalendarIcon,
	HeartHandshake,
	MapPin,
	Minus,
	Plus,
	User,
	X,
} from "lucide-react-native";

import {
	Badge,
	Button,
	Card,
	Heading,
	HStack,
	Input,
	Screen,
	Text,
	VStack,
} from "@/components/ui";
import { ExportButton } from "@/components/ui/ExportButton";
import { useMe } from "@/lib/hooks/useMe";
import {
	useConsentBadNewsLogs,
	LogEntry,
} from "@/lib/hooks/useConsentBadNewsLogs";
import { Colors, Radius, Spacing } from "@/lib/theme";

export interface SkillLevelOption {
	label: string;
	value: "S" | "O" | "A" | "PS" | "PI";
	description: string;
	bgColor: string;
	borderColor: string;
	textColor: string;
}

export const SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
	{
		label: "S",
		value: "S",
		description: "Simulation",
		bgColor: "#F1F5F9",
		borderColor: "#94A3B8",
		textColor: "#475569",
	},
	{
		label: "O",
		value: "O",
		description: "Observed",
		bgColor: "#E8F0FE",
		borderColor: "#4285F4",
		textColor: "#1A73E8",
	},
	{
		label: "A",
		value: "A",
		description: "Assisted",
		bgColor: "#EEF2FF",
		borderColor: "#6366F1",
		textColor: "#4338CA",
	},
	{
		label: "PS",
		value: "PS",
		description: "Performed under Supervision",
		bgColor: "#FEF3C7",
		borderColor: "#F59E0B",
		textColor: "#B45309",
	},
	{
		label: "PI",
		value: "PI",
		description: "Performed Independently",
		bgColor: "#D1FAE5",
		borderColor: "#10B981",
		textColor: "#047857",
	},
];

const LOCATION_PRESETS = ["ER", "ICU", "Ward", "OPD", "Counseling Room", "OR", "Triage"];
const SEX_OPTIONS = ["Male", "Female", "Other"];
const MAX_ENTRIES = 10;

type CategoryType = "consent" | "bad-news";

export default function ConsentBadNewsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const userRole = me?.role === "faculty" || me?.role === "hod" ? "review" : "student";

	const [activeTab, setActiveTab] = useState<CategoryType>("consent");

	const {
		consentEntries,
		badNewsEntries,
		isLoadingEntries,
		refetchEntries,
		summary,
		addRow,
		isAddingRow,
		updateEntry,
		submitEntry,
		signEntry,
		rejectEntry,
	} = useConsentBadNewsLogs({ mode: userRole });

	const [editingEntry, setEditingEntry] = useState<{ entry: LogEntry; category: CategoryType } | null>(null);
	const [rejectionModalEntry, setRejectionModalEntry] = useState<{ entry: LogEntry; category: CategoryType } | null>(null);
	const [rejectionRemark, setRejectionRemark] = useState("");
	const [isSubmittingAction, setIsSubmittingAction] = useState(false);

	const activeEntries = activeTab === "consent" ? consentEntries : badNewsEntries;
	const activeSummary = activeTab === "consent" ? summary?.consent : summary?.badNews;

	const filledCount = activeEntries.filter(
		(e) => e.completeDiagnosis || e.procedureDescription || e.patientName || e.status !== "DRAFT"
	).length;
	const signedCount = activeEntries.filter((e) => e.status === "SIGNED").length;

	const handleAddRow = async () => {
		if (activeEntries.length >= MAX_ENTRIES) {
			Alert.alert(
				"Capacity Reached",
				`All ${MAX_ENTRIES} entry rows for ${activeTab === "consent" ? "Taking Informed Consent" : "Breaking Bad News"} have already been added to your logbook.`
			);
			return;
		}
		try {
			const newEntry = await addRow(activeTab);
			refetchEntries();
			if (newEntry?.entry) {
				setEditingEntry({ entry: newEntry.entry, category: activeTab });
			} else if (newEntry) {
				setEditingEntry({ entry: newEntry, category: activeTab });
			}
		} catch (e: any) {
			const msg =
				e?.response?.data?.error ||
				e?.response?.data?.message ||
				e?.message ||
				`All ${MAX_ENTRIES} entry rows for ${activeTab === "consent" ? "Taking Informed Consent" : "Breaking Bad News"} have already been added to your logbook.`;
			Alert.alert("Notice", msg);
		}
	};

	const handleClearDraft = (entry: LogEntry) => {
		Alert.alert(
			"Clear Draft Fields",
			`Are you sure you want to clear draft data for Sl No: ${entry.slNo}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: async () => {
						try {
							await updateEntry({
								id: entry.id,
								category: activeTab,
								data: {
									date: null,
									patientName: null,
									patientAge: null,
									patientSex: null,
									uhid: null,
									completeDiagnosis: null,
									procedureDescription: null,
									performedAtLocation: null,
									skillLevel: null,
									totalProcedureTally: 0,
									facultyId: null,
								},
							});
							refetchEntries();
						} catch (e: any) {
							Alert.alert("Error", e.message || "Failed to clear draft fields");
						}
					},
				},
			]
		);
	};

	const handleSubmit = async (id: string) => {
		try {
			setIsSubmittingAction(true);
			await submitEntry({ id, category: activeTab });
			refetchEntries();
		} catch (e: any) {
			Alert.alert("Submission Error", e.message || "Failed to submit entry");
		} finally {
			setIsSubmittingAction(false);
		}
	};

	const handleSign = async (id: string) => {
		try {
			setIsSubmittingAction(true);
			await signEntry({ id, category: activeTab });
			refetchEntries();
		} catch (e: any) {
			Alert.alert("Sign Off Error", e.message || "Failed to sign entry");
		} finally {
			setIsSubmittingAction(false);
		}
	};

	const handleRejectSubmit = async () => {
		if (!rejectionModalEntry || !rejectionRemark.trim()) {
			Alert.alert("Remark Required", "Please provide a reason for requesting revision.");
			return;
		}
		try {
			setIsSubmittingAction(true);
			await rejectEntry({
				id: rejectionModalEntry.entry.id,
				category: rejectionModalEntry.category,
				remark: rejectionRemark.trim(),
			});
			setRejectionModalEntry(null);
			setRejectionRemark("");
			refetchEntries();
		} catch (e: any) {
			Alert.alert("Revision Error", e.message || "Failed to request revision");
		} finally {
			setIsSubmittingAction(false);
		}
	};

	return (
		<Screen bleed>
			<View style={styles.detailContainer}>
				{/* Header */}
				<View style={styles.subViewHeader}>
					<HStack align="center" justify="space-between">
						<HStack align="center" gap="2" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
							<Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
								<ArrowLeft size={22} color={Colors.foreground} />
							</Pressable>
							<HeartHandshake size={24} color={Colors.accent} />
							<VStack style={{ flex: 1, minWidth: 0 }}>
								<Heading level={3} numberOfLines={1}>
									Consent & Bad News
								</Heading>
								<Text variant="muted" numberOfLines={1}>
									Informed Consent & Breaking Bad News
								</Text>
							</VStack>
						</HStack>

						<View style={{ flexShrink: 0 }}>
							<ExportButton module={activeTab} />
						</View>
					</HStack>

					{/* Category Tabs Switcher */}
					<HStack gap="2" style={styles.tabContainer}>
						<Pressable
							onPress={() => setActiveTab("consent")}
							style={[styles.tabBtn, activeTab === "consent" && styles.tabBtnActive]}
						>
							<Text
								variant="bodySm"
								style={[styles.tabBtnText, activeTab === "consent" && styles.tabBtnTextActive]}
							>
								Informed Consent ({consentEntries.length})
							</Text>
						</Pressable>
						<Pressable
							onPress={() => setActiveTab("bad-news")}
							style={[styles.tabBtn, activeTab === "bad-news" && styles.tabBtnActive]}
						>
							<Text
								variant="bodySm"
								style={[styles.tabBtnText, activeTab === "bad-news" && styles.tabBtnTextActive]}
							>
								Breaking Bad News ({badNewsEntries.length})
							</Text>
						</Pressable>
					</HStack>
				</View>

				{isLoadingEntries ? (
					<View style={styles.loadingBox}>
						<ActivityIndicator size="large" color={Colors.accent} />
					</View>
				) : (
					<FlatList
						data={activeEntries}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.listContainer}
						ListHeaderComponent={
							<Card variant="flat" style={styles.progressSummaryCard}>
								<VStack gap="2">
									<HStack align="center" justify="space-between">
										<VStack gap="1" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
											<Heading level={3} numberOfLines={1}>
												{activeTab === "consent" ? "Informed Consent" : "Breaking Bad News"} Progress
											</Heading>
											<Text variant="muted">
												{signedCount} of {activeEntries.length} entries signed off
											</Text>
										</VStack>

										<HStack align="center" gap="2" style={{ flexShrink: 0 }}>
											<Badge label={`${filledCount}/${MAX_ENTRIES}`} tone="accent" />
											{userRole === "student" && (
												<Button
													label="+ Add Row"
													variant="primary"
													size="sm"
													onPress={handleAddRow}
													loading={isAddingRow}
												/>
											)}
										</HStack>
									</HStack>

									<View style={styles.trackBackground}>
										<View
											style={[
												styles.trackFill,
												{ width: `${activeEntries.length > 0 ? (signedCount / activeEntries.length) * 100 : 0}%` },
											]}
										/>
									</View>
								</VStack>
							</Card>
						}
						renderItem={({ item }) => (
							<ConsentBadNewsCard
								entry={item}
								category={activeTab}
								userRole={userRole}
								onEdit={() => setEditingEntry({ entry: item, category: activeTab })}
								onClear={() => handleClearDraft(item)}
								onSubmit={() => handleSubmit(item.id)}
								onSign={() => handleSign(item.id)}
								onReject={() => setRejectionModalEntry({ entry: item, category: activeTab })}
								isSubmitting={isSubmittingAction}
							/>
						)}
					/>
				)}

				{editingEntry && (
					<ConsentBadNewsEditModal
						entry={editingEntry.entry}
						category={editingEntry.category}
						facultyList={summary?.faculty || []}
						visible={Boolean(editingEntry)}
						onClose={() => setEditingEntry(null)}
						onSave={async (updatedData) => {
							await updateEntry({
								id: editingEntry.entry.id,
								category: editingEntry.category,
								data: updatedData,
							});
							setEditingEntry(null);
							refetchEntries();
						}}
					/>
				)}

				{rejectionModalEntry && (
					<Modal visible transparent animationType="fade" onRequestClose={() => setRejectionModalEntry(null)}>
						<Pressable style={styles.modalBackdrop} onPress={() => setRejectionModalEntry(null)}>
							<Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
								<VStack gap="3">
									<Heading level={3}>Request Revision</Heading>
									<Text variant="muted">
										Specify revision details for entry Sl No: {rejectionModalEntry.entry.slNo}.
									</Text>
									<Input
										placeholder="Enter faculty feedback/remark..."
										value={rejectionRemark}
										onChangeText={setRejectionRemark}
										multiline
										numberOfLines={3}
									/>
									<HStack justify="flex-end" gap="2">
										<Button label="Cancel" variant="ghost" size="sm" onPress={() => setRejectionModalEntry(null)} />
										<Button
											label="Submit Request"
											variant="danger"
											size="sm"
											onPress={handleRejectSubmit}
											loading={isSubmittingAction}
										/>
									</HStack>
								</VStack>
							</Pressable>
						</Pressable>
					</Modal>
				)}
			</View>
		</Screen>
	);
}

function ConsentBadNewsCard({
	entry,
	category,
	userRole,
	onEdit,
	onClear,
	onSubmit,
	onSign,
	onReject,
	isSubmitting,
}: {
	entry: LogEntry;
	category: CategoryType;
	userRole: "student" | "review";
	onEdit: () => void;
	onClear: () => void;
	onSubmit: () => void;
	onSign: () => void;
	onReject: () => void;
	isSubmitting: boolean;
}) {
	const tone =
		entry.status === "SIGNED"
			? "signed"
			: entry.status === "SUBMITTED"
			? "submitted"
			: entry.status === "NEEDS_REVISION"
			? "needsRevision"
			: "draft";

	const levelConfig = SKILL_LEVEL_OPTIONS.find((s) => s.value === entry.skillLevel);

	return (
		<Card variant="default" style={styles.entryCard}>
			<VStack gap="2">
				{/* Header */}
				<HStack align="center" justify="space-between" style={{ width: "100%" }}>
					<HStack align="center" gap="2" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
						<View style={{ flexShrink: 0 }}>
							<Badge label={`SL ${entry.slNo}`} tone="neutral" />
						</View>
						<Heading level={4} numberOfLines={1} style={{ flex: 1, flexShrink: 1 }}>
							{entry.patientName || `${category === "consent" ? "Consent" : "Bad News"} #${entry.slNo}`}
						</Heading>
					</HStack>

					<View style={{ flexShrink: 0 }}>
						<Badge label={entry.status} tone={tone} />
					</View>
				</HStack>

				{/* Rejection Banner */}
				{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
					<View style={styles.rejectionBanner}>
						<AlertTriangle size={14} color={Colors.warningForeground} />
						<Text variant="bodySm" color={Colors.warningForeground} style={{ flex: 1 }}>
							{entry.facultyRemark}
						</Text>
					</View>
				)}

				{/* Details Box */}
				<VStack gap="1" style={styles.entryFieldsBox}>
					<HStack align="center" justify="space-between">
						<Text variant="muted">Date:</Text>
						<Text variant="bodyStrong">
							{entry.date ? new Date(entry.date).toLocaleDateString() : "Not set"}
						</Text>
					</HStack>

					{(entry.patientName || entry.patientAge || entry.patientSex || entry.uhid) && (
						<HStack align="center" justify="space-between">
							<Text variant="muted">Patient Info:</Text>
							<Text variant="bodySm" style={{ fontWeight: "600" }}>
								{[
									entry.patientName,
									entry.patientAge ? `${entry.patientAge}y` : null,
									entry.patientSex,
									entry.uhid ? `UHID: ${entry.uhid}` : null,
								]
									.filter(Boolean)
									.join(" | ")}
							</Text>
						</HStack>
					)}

					<HStack align="center" justify="space-between">
						<Text variant="muted">Skill Level (S/O/A/PS/PI):</Text>
						{levelConfig ? (
							<View
								style={[
									styles.dynamicLevelBadge,
									{
										backgroundColor: levelConfig.bgColor,
										borderColor: levelConfig.borderColor,
									},
								]}
							>
								<Text
									variant="bodySm"
									style={{ color: levelConfig.textColor, fontWeight: "600" }}
								>
									{levelConfig.value} — {levelConfig.description}
								</Text>
							</View>
						) : (
							<Text variant="muted" style={{ fontStyle: "italic" }}>
								Not selected
							</Text>
						)}
					</HStack>

					{entry.performedAtLocation && (
						<HStack align="center" justify="space-between">
							<Text variant="muted">Location:</Text>
							<Badge label={entry.performedAtLocation} tone="neutral" />
						</HStack>
					)}

					{entry.completeDiagnosis && (
						<VStack gap="1">
							<Text variant="muted">Complete Diagnosis:</Text>
							<Text variant="bodySm" style={styles.diagnosisText}>
								{entry.completeDiagnosis}
							</Text>
						</VStack>
					)}

					{entry.procedureDescription && (
						<VStack gap="1">
							<Text variant="muted">
								{category === "consent" ? "Procedure Consent Description:" : "Nature of Bad News / Scenario:"}
							</Text>
							<Text variant="bodySm">{entry.procedureDescription}</Text>
						</VStack>
					)}

					{(entry.totalProcedureTally ?? 0) > 0 && (
						<HStack align="center" justify="space-between">
							<Text variant="muted">Total Tally:</Text>
							<Text variant="bodyStrong">
								{entry.totalProcedureTally} times
							</Text>
						</HStack>
					)}
				</VStack>

				{/* Card Actions Footer */}
				<HStack justify="flex-end" gap="2" style={styles.cardFooter}>
					{userRole === "student" && (
						<>
							{(entry.status === "DRAFT" || entry.status === "NEEDS_REVISION") && (
								<>
									<Button label="Clear" variant="ghost" size="sm" onPress={onClear} />
									<Button label="Edit" variant="secondary" size="sm" onPress={onEdit} />
									<Button
										label="Submit"
										variant="primary"
										size="sm"
										onPress={onSubmit}
										loading={isSubmitting}
									/>
								</>
							)}
						</>
					)}

					{userRole === "review" && entry.status === "SUBMITTED" && (
						<>
							<Button label="Revise" variant="secondary" size="sm" onPress={onReject} />
							<Button label="Sign Off" variant="primary" size="sm" onPress={onSign} loading={isSubmitting} />
						</>
					)}
				</HStack>
			</VStack>
		</Card>
	);
}

function ConsentBadNewsEditModal({
	entry,
	category,
	facultyList,
	visible,
	onClose,
	onSave,
}: {
	entry: LogEntry;
	category: CategoryType;
	facultyList: Array<{ id: string; firstName: string; lastName: string }>;
	visible: boolean;
	onClose: () => void;
	onSave: (data: any) => Promise<void>;
}) {
	const [date, setDate] = useState<Date>(entry.date ? new Date(entry.date) : new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [patientName, setPatientName] = useState(entry.patientName || "");
	const [patientAge, setPatientAge] = useState(entry.patientAge?.toString() || "");
	const [patientSex, setPatientSex] = useState(entry.patientSex || "Male");
	const [uhid, setUhid] = useState(entry.uhid || "");
	const [completeDiagnosis, setCompleteDiagnosis] = useState(entry.completeDiagnosis || "");
	const [procedureDescription, setProcedureDescription] = useState(entry.procedureDescription || "");
	const [performedAtLocation, setPerformedAtLocation] = useState(entry.performedAtLocation || "ER");
	const [skillLevel, setSkillLevel] = useState<string | null>(entry.skillLevel);
	const [tallyCount, setTallyCount] = useState<number>(entry.totalProcedureTally ?? 0);
	const [facultyId, setFacultyId] = useState<string | null>(entry.facultyId);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		try {
			setSaving(true);
			await onSave({
				date: date.toISOString(),
				patientName: patientName.trim() || null,
				patientAge: parseInt(patientAge, 10) || null,
				patientSex,
				uhid: uhid.trim() || null,
				completeDiagnosis: completeDiagnosis.trim() || null,
				procedureDescription: procedureDescription.trim() || null,
				performedAtLocation,
				skillLevel,
				totalProcedureTally: tallyCount,
				facultyId,
			});
		} catch (e: any) {
			Alert.alert("Save Error", e.message || "Failed to save entry");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<View style={styles.editModalContent}>
					{/* Header */}
					<HStack align="center" justify="space-between" style={styles.editModalHeader}>
						<VStack style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
							<Text variant="muted">Edit {category === "consent" ? "Informed Consent" : "Breaking Bad News"} — Sl {entry.slNo}</Text>
							<Heading level={3} numberOfLines={1}>
								{category === "consent" ? "Taking Informed Consent" : "Breaking Bad News"}
							</Heading>
						</VStack>
						<Pressable onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.mutedSoft} />
						</Pressable>
					</HStack>

					<ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
						{/* 1. Date Picker */}
						<VStack gap="1">
							<Text variant="bodyStrong">Log Date</Text>
							<Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
								<CalendarIcon size={16} color={Colors.accent} />
								<Text variant="bodySm" color={Colors.foreground}>
									{date.toLocaleDateString()}
								</Text>
							</Pressable>
							{showDatePicker && (
								<DateTimePicker
									value={date}
									mode="date"
									display="default"
									onChange={(_, selectedDate) => {
										setShowDatePicker(false);
										if (selectedDate) setDate(selectedDate);
									}}
								/>
							)}
						</VStack>

						{/* 2. Patient Info Inputs */}
						<VStack gap="2">
							<Text variant="bodyStrong">Patient Information</Text>
							<Input
								label="Patient Name"
								placeholder="Enter patient full name..."
								value={patientName}
								onChangeText={setPatientName}
							/>

							<HStack gap="2">
								<Input
									label="Age (Years)"
									placeholder="e.g. 45"
									keyboardType="numeric"
									value={patientAge}
									onChangeText={setPatientAge}
									style={{ flex: 1 }}
								/>
								<Input
									label="UHID / Reg No"
									placeholder="Hospital UHID"
									value={uhid}
									onChangeText={setUhid}
									style={{ flex: 1 }}
								/>
							</HStack>

							<VStack gap="1">
								<Text variant="bodySm" color={Colors.muted}>Patient Sex</Text>
								<HStack gap="2">
									{SEX_OPTIONS.map((s) => {
										const isSelected = patientSex === s;
										return (
											<Pressable
												key={s}
												onPress={() => setPatientSex(s)}
												style={[styles.sexChip, isSelected && styles.sexChipSelected]}
											>
												<Text variant="bodySm" color={isSelected ? Colors.accent : Colors.foreground}>
													{s}
												</Text>
											</Pressable>
										);
									})}
								</HStack>
							</VStack>
						</VStack>

						{/* 3. Skill Level (S/O/A/PS/PI) — Dynamic Colors */}
						<VStack gap="2">
							<Text variant="bodyStrong">Skill Level (S / O / A / PS / PI)</Text>
							<HStack gap="2" style={{ flexWrap: "wrap" }}>
								{SKILL_LEVEL_OPTIONS.map((lvl) => {
									const isSelected = skillLevel === lvl.value;
									return (
										<Pressable
											key={lvl.value}
											onPress={() => setSkillLevel(lvl.value)}
											style={[
												styles.dynamicChoiceChip,
												{
													backgroundColor: isSelected ? lvl.bgColor : Colors.surface,
													borderColor: isSelected ? lvl.borderColor : Colors.mutedSoft,
												},
											]}
										>
											<Text
												variant="bodySm"
												style={{
													color: isSelected ? lvl.textColor : Colors.foreground,
													fontWeight: isSelected ? "700" : "400",
												}}
											>
												{lvl.value} ({lvl.description})
											</Text>
										</Pressable>
									);
								})}
							</HStack>
						</VStack>

						{/* 4. Complete Diagnosis */}
						<Input
							label="Complete Diagnosis"
							placeholder="Enter complete clinical diagnosis..."
							value={completeDiagnosis}
							onChangeText={setCompleteDiagnosis}
							multiline
							numberOfLines={3}
						/>

						{/* 5. Procedure Description / Bad News Scenario */}
						<Input
							label={category === "consent" ? "Procedure Consent Taken For" : "Nature of Bad News / Scenario"}
							placeholder={
								category === "consent"
									? "Describe procedure for which consent was obtained..."
									: "Describe bad news scenario / counseling details..."
							}
							value={procedureDescription}
							onChangeText={setProcedureDescription}
							multiline
							numberOfLines={3}
						/>

						{/* 6. Performed Location (Dynamic Input + Presets) */}
						<VStack gap="2">
							<Input
								label="Location"
								placeholder="e.g. ER, ICU, Ward, OPD, Counseling Room..."
								value={performedAtLocation}
								onChangeText={setPerformedAtLocation}
							/>
							<VStack gap="1">
								<Text variant="bodySm" color={Colors.muted}>Quick Location Presets:</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
									{LOCATION_PRESETS.map((loc) => {
										const isSelected = performedAtLocation?.trim() === loc;
										return (
											<Pressable
												key={loc}
												onPress={() => setPerformedAtLocation(loc)}
												style={[styles.locationChip, isSelected && styles.locationChipSelected]}
											>
												<MapPin size={12} color={isSelected ? Colors.surface : Colors.foreground} />
												<Text variant="bodySm" color={isSelected ? Colors.surface : Colors.foreground}>
													{loc}
												</Text>
											</Pressable>
										);
									})}
								</ScrollView>
							</VStack>
						</VStack>

						{/* 7. Total Procedure Tally Stepper */}
						<VStack gap="2">
							<Text variant="bodyStrong">Tally</Text>
							<HStack align="center" gap="3">
								<Pressable
									style={styles.stepperBtn}
									onPress={() => setTallyCount(Math.max(0, tallyCount - 1))}
								>
									<Minus size={16} color={Colors.foreground} />
								</Pressable>
								<Input
									value={tallyCount.toString()}
									onChangeText={(val) => setTallyCount(parseInt(val, 10) || 0)}
									keyboardType="numeric"
									style={styles.stepperInput}
								/>
								<Pressable
									style={styles.stepperBtn}
									onPress={() => setTallyCount(tallyCount + 1)}
								>
									<Plus size={16} color={Colors.foreground} />
								</Pressable>
							</HStack>
						</VStack>

						{/* 8. Supervising Faculty Selection */}
						<VStack gap="2">
							<Text variant="bodyStrong">Faculty/SR Sign</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
								{facultyList.map((f) => {
									const isSelected = facultyId === f.id;
									return (
										<Pressable
											key={f.id}
											onPress={() => setFacultyId(f.id)}
											style={[styles.facultyChip, isSelected && styles.facultyChipSelected]}
										>
											<User size={12} color={isSelected ? Colors.surface : Colors.foreground} />
											<Text variant="bodySm" color={isSelected ? Colors.surface : Colors.foreground}>
												Dr. {f.firstName} {f.lastName}
											</Text>
										</Pressable>
									);
								})}
							</ScrollView>
						</VStack>
					</ScrollView>

					{/* Actions Footer */}
					<HStack justify="flex-end" gap="2" style={styles.editModalFooter}>
						<Button label="Cancel" variant="ghost" size="sm" onPress={onClose} />
						<Button label="Save Entry" variant="primary" size="sm" onPress={handleSave} loading={saving} />
					</HStack>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	listContainer: {
		padding: Spacing["4"],
		gap: Spacing["4"],
		paddingBottom: 40,
	},
	backBtn: {
		padding: 4,
		borderRadius: Radius.pill,
	},
	tabContainer: {
		marginTop: Spacing["3"],
		backgroundColor: Colors.surfaceMuted,
		borderRadius: Radius.lg,
		padding: 4,
	},
	tabBtn: {
		flex: 1,
		paddingVertical: 8,
		alignItems: "center",
		borderRadius: Radius.md,
	},
	tabBtnActive: {
		backgroundColor: Colors.surface,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	tabBtnText: {
		color: Colors.muted,
		fontWeight: "500",
	},
	tabBtnTextActive: {
		color: Colors.accent,
		fontWeight: "700",
	},
	trackBackground: {
		height: 6,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceMuted,
		overflow: "hidden",
	},
	trackFill: {
		height: "100%",
		backgroundColor: Colors.accent,
		borderRadius: Radius.pill,
	},
	detailContainer: {
		flex: 1,
	},
	subViewHeader: {
		paddingHorizontal: Spacing["4"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceMuted,
	},
	loadingBox: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	progressSummaryCard: {
		padding: Spacing["4"],
		marginBottom: Spacing["2"],
	},
	entryCard: {
		padding: Spacing["4"],
		backgroundColor: Colors.surface,
		marginVertical: 2,
	},
	rejectionBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: Colors.amber + "15",
		padding: Spacing["2"],
		borderRadius: Radius.md,
	},
	entryFieldsBox: {
		backgroundColor: Colors.surfaceMuted,
		padding: Spacing["3"],
		borderRadius: Radius.md,
	},
	dynamicLevelBadge: {
		paddingHorizontal: Spacing["2"],
		paddingVertical: 4,
		borderRadius: Radius.md,
		borderWidth: 1,
	},
	diagnosisText: {
		color: Colors.foreground,
		fontStyle: "italic",
	},
	cardFooter: {
		marginTop: Spacing["2"],
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		padding: Spacing["4"],
	},
	modalCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing["4"],
	},
	editModalContent: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing["4"],
		gap: Spacing["4"],
	},
	editModalHeader: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceMuted,
		paddingBottom: Spacing["2"],
	},
	datePickerBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.mutedSoft,
		backgroundColor: Colors.surface,
	},
	sexChip: {
		paddingHorizontal: Spacing["3"],
		paddingVertical: 6,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.mutedSoft,
		backgroundColor: Colors.surface,
	},
	sexChipSelected: {
		borderColor: Colors.accent,
		backgroundColor: Colors.accent + "15",
	},
	dynamicChoiceChip: {
		paddingHorizontal: Spacing["3"],
		paddingVertical: 8,
		borderRadius: Radius.md,
		borderWidth: 1,
	},
	locationChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: Spacing["3"],
		paddingVertical: 6,
		borderRadius: Radius.pill,
		borderWidth: 1,
		borderColor: Colors.mutedSoft,
		backgroundColor: Colors.surface,
	},
	locationChipSelected: {
		backgroundColor: Colors.foreground,
		borderColor: Colors.foreground,
	},
	stepperBtn: {
		width: 38,
		height: 38,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceMuted,
		borderWidth: 1,
		borderColor: Colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	stepperInput: {
		width: 70,
		textAlign: "center",
	},
	facultyChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: Spacing["3"],
		paddingVertical: 6,
		borderRadius: Radius.pill,
		borderWidth: 1,
		borderColor: Colors.mutedSoft,
		backgroundColor: Colors.surface,
	},
	facultyChipSelected: {
		backgroundColor: Colors.foreground,
		borderColor: Colors.foreground,
	},
	editModalFooter: {
		borderTopWidth: 1,
		borderTopColor: Colors.surfaceMuted,
		paddingTop: Spacing["2"],
	},
});
