import React, { useState, useEffect } from "react";
import {
	ActivityIndicator,
	Alert,
	BackHandler,
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
	CheckCircle2,
	ChevronRight,
	Lock,
	MapPin,
	Maximize2,
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
	IconBubble,
	Input,
	Screen,
	Text,
	VStack,
} from "@/components/ui";
import { ExportButton } from "@/components/ui/ExportButton";
import { useMe } from "@/lib/hooks/useMe";
import {
	useImagingLogs,
	ImagingLogEntry,
} from "@/lib/hooks/useImagingLogs";
import {
	IMAGING_CATEGORIES,
	ImagingCategoryConfig,
} from "@/lib/constants/imaging-categories";
import { Colors, Radius, Spacing } from "@/lib/theme";

const SKILL_LEVELS = [
	{ label: "S", value: "S", description: "Simulation" },
	{ label: "O", value: "O", description: "Observed" },
	{ label: "A", value: "A", description: "Assisted" },
	{ label: "PS", value: "PS", description: "Performed under Supervision" },
	{ label: "PI", value: "PI", description: "Performed Independently" },
];

export default function ImagingScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const userRole = me?.role === "faculty" || me?.role === "hod" ? "review" : "student";

	const [activeCategory, setActiveCategory] = useState<ImagingCategoryConfig | null>(null);

	useEffect(() => {
		const onBackPress = () => {
			if (activeCategory) {
				setActiveCategory(null);
				return true;
			}
			return false;
		};

		const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
		return () => subscription.remove();
	}, [activeCategory]);

	return (
		<Screen bleed>
			{activeCategory ? (
				<ImagingCategoryDetailView
					category={activeCategory}
					userRole={userRole}
					onBack={() => setActiveCategory(null)}
				/>
			) : (
				<ImagingOverviewGrid
					userRole={userRole}
					onSelectCategory={(cat) => setActiveCategory(cat)}
					onBack={() => router.back()}
				/>
			)}
		</Screen>
	);
}

function ImagingOverviewGrid({
	userRole,
	onSelectCategory,
	onBack,
}: {
	userRole: "student" | "review";
	onSelectCategory: (cat: ImagingCategoryConfig) => void;
	onBack: () => void;
}) {
	const { summary } = useImagingLogs({ mode: userRole });

	return (
		<FlatList
			data={IMAGING_CATEGORIES}
			keyExtractor={(item) => item.code}
			contentContainerStyle={styles.listContainer}
			ListHeaderComponent={
				<VStack gap="3" style={styles.headerBanner}>
					<HStack align="center" gap="2">
						<Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
							<ArrowLeft size={22} color={Colors.foreground} />
						</Pressable>
						<VStack style={{ flex: 1 }}>
							<Heading level={2}>Imaging Logs</Heading>
							<Text variant="muted">
								Ultrasound, POCUS, X-Ray, CT Scan, and MRI imaging analysis
							</Text>
						</VStack>
					</HStack>

					<Card variant="flat" style={styles.infoCard}>
						<VStack gap="1">
							<Text variant="bodyStrong" color={Colors.accent}>
								Skill Progression Track
							</Text>
							<Text variant="bodySm" color={Colors.muted}>
								Skill Levels: S (Simulation) → O (Observed) → A (Assisted) → PS (Performed Supervised) → PI (Performed Independently)
							</Text>
						</VStack>
					</Card>
				</VStack>
			}
			renderItem={({ item }) => {
				const filledCount = summary?.totalByCategory?.[item.enumValue] || 0;
				const signedCount = summary?.signedByCategory?.[item.enumValue] || 0;
				const progressPercent = Math.min(100, Math.round((filledCount / item.maxEntries) * 100));

				return (
					<Pressable
						onPress={() => onSelectCategory(item)}
						style={({ pressed }) => [styles.categoryCard, pressed && styles.cardPressed]}
					>
						<VStack gap="2">
							<HStack align="center" justify="space-between">
								<HStack align="center" gap="2">
									<IconBubble icon={<Maximize2 size={18} color={Colors.surface} />} tone="sky" size={32} />
									<Badge label={item.code} tone="neutral" />
								</HStack>
								<ChevronRight size={20} color={Colors.mutedSoft} />
							</HStack>

							<VStack gap="1">
								<Heading level={3}>{item.label}</Heading>
								<Text variant="bodySm" color={Colors.muted}>
									{filledCount} of {item.maxEntries} entries
								</Text>
							</VStack>

							<VStack gap="1">
								<HStack align="center" justify="space-between">
									<Text variant="bodySm">
										{filledCount} / {item.maxEntries} logged
									</Text>
									<Text variant="bodySm" color={Colors.accent}>
										{progressPercent}%
									</Text>
								</HStack>

								<View style={styles.trackBackground}>
									<View
										style={[
											styles.trackFill,
											{ width: `${progressPercent}%` },
										]}
									/>
								</View>

								{signedCount > 0 && (
									<HStack align="center" gap="1" style={{ marginTop: 2 }}>
										<CheckCircle2 size={12} color={Colors.success} />
										<Text variant="bodySm" color={Colors.success}>
											{signedCount} signed off
										</Text>
									</HStack>
								)}
							</VStack>
						</VStack>
					</Pressable>
				);
			}}
		/>
	);
}

function ImagingCategoryDetailView({
	category,
	userRole,
	onBack,
}: {
	category: ImagingCategoryConfig;
	userRole: "student" | "review";
	onBack: () => void;
}) {
	const {
		entries,
		isLoadingEntries,
		refetchEntries,
		summary,
		addRow,
		isAddingRow,
		updateEntry,
		submitEntry,
		signEntry,
		rejectEntry,
	} = useImagingLogs({ category: category.enumValue, mode: userRole });

	const [editingEntry, setEditingEntry] = useState<ImagingLogEntry | null>(null);
	const [rejectionModalEntry, setRejectionModalEntry] = useState<ImagingLogEntry | null>(null);
	const [rejectionRemark, setRejectionRemark] = useState("");
	const [isSubmittingAction, setIsSubmittingAction] = useState(false);

	const filledCount = entries.filter(
		(e) => e.completeDiagnosis || e.procedureDescription || e.patientName || e.status !== "DRAFT"
	).length;
	const signedCount = entries.filter((e) => e.status === "SIGNED").length;

	const handleAddRow = async () => {
		if (entries.length >= category.maxEntries) {
			Alert.alert("Capacity Reached", `Maximum limit of ${category.maxEntries} entries reached for this category.`);
			return;
		}
		try {
			await addRow(category.enumValue);
			refetchEntries();
		} catch (e: any) {
			Alert.alert("Error", e.message || "Failed to add new imaging row.");
		}
	};

	const handleClearDraft = (entry: ImagingLogEntry) => {
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
			await submitEntry(id);
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
			await signEntry({ id });
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
			await rejectEntry({ id: rejectionModalEntry.id, remark: rejectionRemark.trim() });
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
		<View style={styles.detailContainer}>
			<View style={styles.subViewHeader}>
				<HStack align="center" justify="space-between">
					<HStack align="center" gap="2" style={{ flex: 1 }}>
						<Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
							<ArrowLeft size={22} color={Colors.foreground} />
						</Pressable>
						<VStack style={{ flex: 1 }}>
							<Heading level={3} numberOfLines={1}>
								{category.label}
							</Heading>
							<Text variant="muted">
								{category.maxEntries} max slots — tap row to edit
							</Text>
						</VStack>
					</HStack>

					<ExportButton
						module="imaging"
						extraParams={{ category: category.enumValue }}
					/>
				</HStack>
			</View>

			{isLoadingEntries ? (
				<View style={styles.loadingBox}>
					<ActivityIndicator size="large" color={Colors.accent} />
				</View>
			) : (
				<FlatList
					data={entries}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContainer}
					ListHeaderComponent={
						<Card variant="flat" style={styles.progressSummaryCard}>
							<HStack align="center" justify="space-between">
								<VStack gap="1">
									<Heading level={3} numberOfLines={1}>
										{category.label}
									</Heading>
									<Text variant="muted">
										{signedCount} of {category.maxEntries} entries signed off
									</Text>
								</VStack>

								<HStack align="center" gap="2">
									<Badge label={`${entries.length}/${category.maxEntries}`} tone="accent" />
									{userRole === "student" && entries.length < category.maxEntries && (
										<Button
											label="Add Row"
											variant="primary"
											size="sm"
											onPress={handleAddRow}
											loading={isAddingRow}
										/>
									)}
								</HStack>
							</HStack>

							<View style={[styles.trackBackground, { marginTop: 12 }]}>
								<View
									style={[
										styles.trackFill,
										{ width: `${(signedCount / category.maxEntries) * 100}%` },
									]}
								/>
							</View>
						</Card>
					}
					renderItem={({ item }) => (
						<ImagingLogCard
							entry={item}
							userRole={userRole}
							onEdit={() => setEditingEntry(item)}
							onClear={() => handleClearDraft(item)}
							onSubmit={() => handleSubmit(item.id)}
							onSign={() => handleSign(item.id)}
							onReject={() => setRejectionModalEntry(item)}
							isSubmitting={isSubmittingAction}
						/>
					)}
				/>
			)}

			{editingEntry && (
				<ImagingLogEditModal
					entry={editingEntry}
					categoryLabel={category.label}
					facultyList={summary?.faculty || []}
					visible={Boolean(editingEntry)}
					onClose={() => setEditingEntry(null)}
					onSave={async (updatedData) => {
						await updateEntry({ id: editingEntry.id, data: updatedData });
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
									Specify revision details for Sl No: {rejectionModalEntry.slNo}.
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
	);
}

function ImagingLogCard({
	entry,
	userRole,
	onEdit,
	onClear,
	onSubmit,
	onSign,
	onReject,
	isSubmitting,
}: {
	entry: ImagingLogEntry;
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

	const formattedDate = entry.date ? new Date(entry.date).toLocaleDateString() : "No date";
	const patientInfo = [
		entry.patientName,
		entry.patientAge ? `${entry.patientAge}y` : null,
		entry.patientSex,
		entry.uhid ? `UHID: ${entry.uhid}` : null,
	]
		.filter(Boolean)
		.join(" / ");

	return (
		<Card variant="default" style={styles.entryCard}>
			<VStack gap="2">
				<HStack align="center" justify="space-between">
					<HStack align="center" gap="2">
						<Badge label={`Sl ${entry.slNo}`} tone="neutral" />
						{entry.skillLevel ? (
							<Badge label={entry.skillLevel} tone="accent" />
						) : (
							<Badge label="Unset" tone="neutral" />
						)}
					</HStack>
					<Badge label={entry.status} tone={tone} />
				</HStack>

				{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
					<View style={styles.rejectionBanner}>
						<AlertTriangle size={14} color={Colors.warningForeground} />
						<Text variant="bodySm" color={Colors.warningForeground} style={{ flex: 1 }}>
							{entry.facultyRemark}
						</Text>
					</View>
				)}

				<VStack gap="1" style={styles.entryFieldsBox}>
					<HStack align="center" justify="space-between">
						<HStack align="center" gap="1">
							<CalendarIcon size={12} color={Colors.mutedSoft} />
							<Text variant="muted">{formattedDate}</Text>
						</HStack>
						{entry.performedAtLocation && (
							<HStack align="center" gap="1">
								<MapPin size={12} color={Colors.mutedSoft} />
								<Text variant="bodyStrong">{entry.performedAtLocation}</Text>
							</HStack>
						)}
					</HStack>

					{patientInfo ? (
						<HStack align="center" gap="2">
							<User size={12} color={Colors.mutedSoft} />
							<Text variant="bodyStrong">{patientInfo}</Text>
						</HStack>
					) : (
						<Text variant="muted" style={{ fontStyle: "italic" }}>
							No patient info recorded
						</Text>
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
							<Text variant="muted">Imaging Type / Findings:</Text>
							<Text variant="bodySm" style={styles.diagnosisText}>
								{entry.procedureDescription}
							</Text>
						</VStack>
					)}
				</VStack>

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

function ImagingLogEditModal({
	entry,
	categoryLabel,
	facultyList,
	visible,
	onClose,
	onSave,
}: {
	entry: ImagingLogEntry;
	categoryLabel: string;
	facultyList: Array<{ id: string; firstName: string; lastName: string }>;
	visible: boolean;
	onClose: () => void;
	onSave: (data: any) => Promise<void>;
}) {
	const [selectedDate, setSelectedDate] = useState<Date>(
		entry.date ? new Date(entry.date) : new Date()
	);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [patientName, setPatientName] = useState(entry.patientName || "");
	const [patientAge, setPatientAge] = useState(entry.patientAge?.toString() || "");
	const [patientSex, setPatientSex] = useState(entry.patientSex || "");
	const [uhid, setUhid] = useState(entry.uhid || "");
	const [completeDiagnosis, setCompleteDiagnosis] = useState(entry.completeDiagnosis || "");
	const [procedureDescription, setProcedureDescription] = useState(entry.procedureDescription || "");
	const [performedAtLocation, setPerformedAtLocation] = useState(entry.performedAtLocation || "");
	const [skillLevel, setSkillLevel] = useState<string | null>(entry.skillLevel);
	const [facultyId, setFacultyId] = useState<string | null>(entry.facultyId);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		try {
			setSaving(true);
			await onSave({
				date: selectedDate.toISOString(),
				patientName: patientName.trim() || null,
				patientAge: patientAge ? parseInt(patientAge, 10) : null,
				patientSex: patientSex.trim() || null,
				uhid: uhid.trim() || null,
				completeDiagnosis: completeDiagnosis.trim() || null,
				procedureDescription: procedureDescription.trim() || null,
				performedAtLocation: performedAtLocation.trim() || null,
				skillLevel,
				facultyId,
			});
		} catch (e: any) {
			Alert.alert("Save Error", e.message || "Failed to save imaging log entry");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<View style={styles.editModalContent}>
					<HStack align="center" justify="space-between" style={styles.editModalHeader}>
						<VStack style={{ flex: 1 }}>
							<Text variant="muted">Edit Imaging Entry — Sl {entry.slNo}</Text>
							<HStack align="center" gap="1">
								<Lock size={14} color={Colors.foreground} />
								<Heading level={3} numberOfLines={1}>
									{categoryLabel}
								</Heading>
							</HStack>
						</VStack>
						<Pressable onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.mutedSoft} />
						</Pressable>
					</HStack>

					<ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
						<VStack gap="1">
							<Text variant="bodyStrong">Log Date</Text>
							<Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
								<CalendarIcon size={16} color={Colors.foreground} />
								<Text variant="bodySm">{selectedDate.toLocaleDateString()}</Text>
							</Pressable>
							{showDatePicker && (
								<DateTimePicker
									value={selectedDate}
									mode="date"
									display="default"
									onChange={(event, date) => {
										setShowDatePicker(false);
										if (date) setSelectedDate(date);
									}}
								/>
							)}
						</VStack>

						<VStack gap="1">
							<Text variant="bodyStrong">Skill Progression Level</Text>
							<HStack gap="2" style={{ flexWrap: "wrap" }}>
								{SKILL_LEVELS.map((s) => {
									const isSelected = skillLevel === s.value;
									return (
										<Pressable
											key={s.value}
											onPress={() => setSkillLevel(s.value)}
											style={[
												styles.choiceChip,
												isSelected && styles.choiceChipSelected,
											]}
										>
											<Text variant="bodySm" color={isSelected ? Colors.accent : Colors.foreground}>
												{s.value} ({s.description})
											</Text>
										</Pressable>
									);
								})}
							</HStack>
						</VStack>

						<Input
							label="Patient Name"
							placeholder="Enter patient name..."
							value={patientName}
							onChangeText={setPatientName}
						/>

						<HStack gap="2">
							<Input
								label="Age"
								placeholder="e.g. 45"
								keyboardType="numeric"
								value={patientAge}
								onChangeText={setPatientAge}
								style={{ flex: 1 }}
							/>
							<Input
								label="Sex"
								placeholder="M / F / Other"
								value={patientSex}
								onChangeText={setPatientSex}
								style={{ flex: 1 }}
							/>
							<Input
								label="UHID"
								placeholder="Hospital ID"
								value={uhid}
								onChangeText={setUhid}
								style={{ flex: 1 }}
							/>
						</HStack>

						<Input
							label="Complete Diagnosis"
							placeholder="Enter diagnosis..."
							value={completeDiagnosis}
							onChangeText={setCompleteDiagnosis}
							multiline
							numberOfLines={2}
						/>

						<Input
							label="Imaging Type / Key Findings"
							placeholder="Describe ultrasound / X-ray / CT / MRI findings..."
							value={procedureDescription}
							onChangeText={setProcedureDescription}
							multiline
							numberOfLines={2}
						/>

						<Input
							label="Performed Location"
							placeholder="e.g. ER, Trauma Bay, ICU, OT"
							value={performedAtLocation}
							onChangeText={setPerformedAtLocation}
						/>

						<VStack gap="1">
							<Text variant="bodyStrong">Supervising Faculty</Text>
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
	headerBanner: {
		marginBottom: Spacing["2"],
	},
	backBtn: {
		padding: 4,
		borderRadius: Radius.pill,
	},
	infoCard: {
		backgroundColor: Colors.sky + "15",
		borderColor: Colors.sky + "40",
		padding: Spacing["3"],
	},
	categoryCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing["4"],
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
		elevation: 1,
	},
	cardPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.99 }],
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
	choiceChip: {
		paddingHorizontal: Spacing["3"],
		paddingVertical: 6,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.mutedSoft,
		backgroundColor: Colors.surface,
	},
	choiceChipSelected: {
		borderColor: Colors.accent,
		backgroundColor: Colors.accent + "15",
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
