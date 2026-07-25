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
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ChevronRight,
	HeartPulse,
	Lock,
	Microscope,
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
	useDiagnosticSkills,
	DiagnosticSkillEntry,
} from "@/lib/hooks/useDiagnosticSkills";
import {
	DIAGNOSTIC_CATEGORIES,
	CONFIDENCE_LEVELS,
	DiagnosticCategoryConfig,
} from "@/lib/constants/diagnostic-types";
import { Colors, Radius, Spacing } from "@/lib/theme";

export default function DiagnosticsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const userRole = me?.role === "faculty" || me?.role === "hod" ? "review" : "student";

	const [activeCategory, setActiveCategory] = useState<DiagnosticCategoryConfig | null>(null);

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
				<DiagnosticCategoryDetailView
					category={activeCategory}
					userRole={userRole}
					onBack={() => setActiveCategory(null)}
				/>
			) : (
				<DiagnosticsOverviewGrid
					userRole={userRole}
					onSelectCategory={(cat) => setActiveCategory(cat)}
					onBack={() => router.back()}
				/>
			)}
		</Screen>
	);
}

function DiagnosticsOverviewGrid({
	userRole,
	onSelectCategory,
	onBack,
}: {
	userRole: "student" | "review";
	onSelectCategory: (cat: DiagnosticCategoryConfig) => void;
	onBack: () => void;
}) {
	const { summary } = useDiagnosticSkills({ mode: userRole });

	const categoryIcons: Record<string, any> = {
		"abg-analysis": Activity,
		"ecg-analysis": HeartPulse,
		"other-diagnostic": Microscope,
	};

	return (
		<FlatList
			data={DIAGNOSTIC_CATEGORIES}
			keyExtractor={(item) => item.key}
			contentContainerStyle={styles.listContainer}
			ListHeaderComponent={
				<VStack gap="3" style={styles.headerBanner}>
					<HStack align="center" gap="2">
						<Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
							<ArrowLeft size={22} color={Colors.foreground} />
						</Pressable>
						<VStack style={{ flex: 1 }}>
							<Heading level={2}>Diagnostic Skills</Heading>
							<Text variant="muted">
								ABG Analysis, ECG Analysis, and Other Diagnostic Investigations
							</Text>
						</VStack>
					</HStack>

					<Card variant="flat" style={styles.infoCard}>
						<VStack gap="1">
							<Text variant="bodyStrong" color={Colors.accent}>
								Diagnostic Confidence Levels
							</Text>
							<Text variant="bodySm" color={Colors.muted}>
								Track diagnostic skills with confidence levels: VC (Very Confident), FC (Fairly Confident), SC (Somewhat Confident), NC (Not Confident).
							</Text>
						</VStack>
					</Card>
				</VStack>
			}
			renderItem={({ item }) => {
				const IconComponent = categoryIcons[item.key] || Microscope;
				const filledCount = summary?.totalByCategory?.[item.enumValue] || 0;
				const signedCount = summary?.signedByCategory?.[item.enumValue] || 0;
				const progressPercent = Math.min(100, Math.round((filledCount / item.totalSkills) * 100));

				return (
					<Pressable
						onPress={() => onSelectCategory(item)}
						style={({ pressed }) => [styles.categoryCard, pressed && styles.cardPressed]}
					>
						<VStack gap="2">
							<HStack align="center" justify="space-between">
								<HStack align="center" gap="2">
									<IconBubble icon={<IconComponent size={18} color={Colors.surface} />} tone="accent" size={32} />
									<Badge label={`${item.totalSkills} skills`} tone="neutral" />
								</HStack>
								<ChevronRight size={20} color={Colors.mutedSoft} />
							</HStack>

							<VStack gap="1">
								<Heading level={3}>{item.label}</Heading>
								<Text variant="bodySm" color={Colors.muted} numberOfLines={2}>
									{item.subtitle}
								</Text>
							</VStack>

							<VStack gap="1">
								<HStack align="center" justify="space-between">
									<Text variant="bodySm">
										{filledCount} of {item.totalSkills} skills logged
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

function DiagnosticCategoryDetailView({
	category,
	userRole,
	onBack,
}: {
	category: DiagnosticCategoryConfig;
	userRole: "student" | "review";
	onBack: () => void;
}) {
	const {
		entries,
		isLoadingEntries,
		refetchEntries,
		summary,
		updateEntry,
		submitEntry,
		signEntry,
		rejectEntry,
	} = useDiagnosticSkills({ category: category.enumValue, mode: userRole });

	const [editingEntry, setEditingEntry] = useState<DiagnosticSkillEntry | null>(null);
	const [rejectionModalEntry, setRejectionModalEntry] = useState<DiagnosticSkillEntry | null>(null);
	const [rejectionRemark, setRejectionRemark] = useState("");
	const [isSubmittingAction, setIsSubmittingAction] = useState(false);

	const filledCount = entries.filter(
		(e) => e.representativeDiagnosis || e.confidenceLevel || e.status !== "DRAFT"
	).length;
	const signedCount = entries.filter((e) => e.status === "SIGNED").length;

	const handleClearDraft = (entry: DiagnosticSkillEntry) => {
		Alert.alert(
			"Clear Draft Fields",
			`Are you sure you want to clear draft data for ${entry.skillName}?`,
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
									skillName: entry.skillName,
									representativeDiagnosis: null,
									confidenceLevel: null,
									totalTimesPerformed: 0,
									facultyId: null,
									diagnosticCategory: category.enumValue,
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
					<HStack align="center" gap="2">
						<Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
							<ArrowLeft size={22} color={Colors.foreground} />
						</Pressable>
						<VStack>
							<Heading level={3} numberOfLines={1}>
								{category.label}
							</Heading>
							<Text variant="muted">
								{category.totalSkills} skills — tap skill to edit
							</Text>
						</VStack>
					</HStack>

					<ExportButton
						module="diagnostics"
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
									<Heading level={3}>{category.label}</Heading>
									<Text variant="muted">
										{signedCount} of {category.totalSkills} skills signed off
									</Text>
								</VStack>
								<Badge label={`${filledCount}/${category.totalSkills}`} tone="accent" />
							</HStack>

							<View style={[styles.trackBackground, { marginTop: 12 }]}>
								<View
									style={[
										styles.trackFill,
										{ width: `${(signedCount / category.totalSkills) * 100}%` },
									]}
								/>
							</View>
						</Card>
					}
					renderItem={({ item }) => (
						<DiagnosticSkillCard
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
				<DiagnosticSkillEditModal
					entry={editingEntry}
					categoryEnum={category.enumValue}
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
									Specify revision details for {rejectionModalEntry.skillName}.
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

function DiagnosticSkillCard({
	entry,
	userRole,
	onEdit,
	onClear,
	onSubmit,
	onSign,
	onReject,
	isSubmitting,
}: {
	entry: DiagnosticSkillEntry;
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

	const confidenceLabel = CONFIDENCE_LEVELS.find((c) => c.value === entry.confidenceLevel)?.description;

	return (
		<Card variant="default" style={styles.entryCard}>
			<VStack gap="2">
				<HStack align="center" justify="space-between">
					<HStack align="center" gap="2">
						<Badge label={`Sl ${entry.slNo}`} tone="neutral" />
						<Heading level={4} numberOfLines={1} style={{ flex: 1 }}>
							{entry.skillName}
						</Heading>
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
						<Text variant="muted">Confidence Level:</Text>
						{entry.confidenceLevel ? (
							<Badge label={`${entry.confidenceLevel} — ${confidenceLabel}`} tone="accent" />
						) : (
							<Text variant="muted">Not selected</Text>
						)}
					</HStack>

					<HStack align="center" justify="space-between">
						<Text variant="muted">Total Performed:</Text>
						<Text variant="bodyStrong">{entry.totalTimesPerformed} times</Text>
					</HStack>

					{entry.representativeDiagnosis && (
						<VStack gap="1">
							<Text variant="muted">Representative Diagnosis:</Text>
							<Text variant="bodySm" style={styles.diagnosisText}>
								{entry.representativeDiagnosis}
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

function DiagnosticSkillEditModal({
	entry,
	categoryEnum,
	facultyList,
	visible,
	onClose,
	onSave,
}: {
	entry: DiagnosticSkillEntry;
	categoryEnum: string;
	facultyList: Array<{ id: string; firstName: string; lastName: string }>;
	visible: boolean;
	onClose: () => void;
	onSave: (data: any) => Promise<void>;
}) {
	const [confidenceLevel, setConfidenceLevel] = useState<string | null>(entry.confidenceLevel);
	const [representativeDiagnosis, setRepresentativeDiagnosis] = useState(entry.representativeDiagnosis || "");
	const [totalTimesPerformed, setTotalTimesPerformed] = useState(entry.totalTimesPerformed?.toString() || "0");
	const [facultyId, setFacultyId] = useState<string | null>(entry.facultyId);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		try {
			setSaving(true);
			await onSave({
				skillName: entry.skillName,
				confidenceLevel,
				representativeDiagnosis: representativeDiagnosis.trim() || null,
				totalTimesPerformed: parseInt(totalTimesPerformed, 10) || 0,
				facultyId,
				diagnosticCategory: categoryEnum,
			});
		} catch (e: any) {
			Alert.alert("Save Error", e.message || "Failed to save skill entry");
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
							<Text variant="muted">Edit Skill Entry — Sl {entry.slNo}</Text>
							<HStack align="center" gap="1">
								<Lock size={14} color={Colors.foreground} />
								<Heading level={3} numberOfLines={1}>
									{entry.skillName}
								</Heading>
							</HStack>
						</VStack>
						<Pressable onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.mutedSoft} />
						</Pressable>
					</HStack>

					<ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
						<VStack gap="1">
							<Text variant="bodyStrong">Confidence Level</Text>
							<HStack gap="2" style={{ flexWrap: "wrap" }}>
								{CONFIDENCE_LEVELS.map((c) => {
									const isSelected = confidenceLevel === c.value;
									return (
										<Pressable
											key={c.value}
											onPress={() => setConfidenceLevel(c.value)}
											style={[
												styles.choiceChip,
												isSelected && styles.choiceChipSelected,
											]}
										>
											<Text variant="bodySm" color={isSelected ? Colors.accent : Colors.foreground}>
												{c.value} ({c.description})
											</Text>
										</Pressable>
									);
								})}
							</HStack>
						</VStack>

						<Input
							label="Representative Diagnosis"
							placeholder="Enter representative clinical diagnosis..."
							value={representativeDiagnosis}
							onChangeText={setRepresentativeDiagnosis}
							multiline
							numberOfLines={2}
						/>

						<Input
							label="Total Times Performed / Interpreted"
							placeholder="e.g. 5"
							keyboardType="numeric"
							value={totalTimesPerformed}
							onChangeText={setTotalTimesPerformed}
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
						<Button label="Save Skill" variant="primary" size="sm" onPress={handleSave} loading={saving} />
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
