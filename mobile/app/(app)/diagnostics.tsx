import React, { useState, useEffect } from "react";
import {
	ActivityIndicator,
	Alert,
	BackHandler,
	FlatList,
	Image,
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
	Camera,
	CheckCircle2,
	ChevronRight,
	HeartPulse,
	Image as ImageIcon,
	Lock,
	Microscope,
	Minus,
	Plus,
	Trash2,
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
	PREDEFINED_DIAGNOSTIC_SKILLS,
	DiagnosticCategoryConfig,
	ConfidenceLevelOption,
} from "@/lib/constants/diagnostic-types";
import {
	pickAndUploadImageToCloudinary,
	captureAndUploadImageToCloudinary,
} from "@/lib/utils/cloudinary";
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
						<VStack style={{ flex: 1, minWidth: 0 }}>
							<Heading level={2}>Diagnostic Skills</Heading>
							<Text variant="muted" numberOfLines={1}>
								ABG Analysis, ECG Analysis & Diagnostics
							</Text>
						</VStack>
					</HStack>

					<Card variant="flat" style={styles.infoCard}>
						<VStack gap="1">
							<Text variant="bodyStrong" color={Colors.accent}>
								Diagnostic Confidence Progression
							</Text>
							<Text variant="bodySm" color={Colors.muted}>
								Track diagnostic skill interpretation with confidence levels: VC (Very Confident), FC (Fairly Confident), SC (Somewhat Confident), NC (Not Confident).
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
		addRow,
		isAddingRow,
		updateEntry,
		submitEntry,
		signEntry,
		rejectEntry,
	} = useDiagnosticSkills({ category: category.enumValue, mode: userRole });

	const [editingEntry, setEditingEntry] = useState<DiagnosticSkillEntry | null>(null);
	const [showSelectSkillModal, setShowSelectSkillModal] = useState(false);
	const [rejectionModalEntry, setRejectionModalEntry] = useState<DiagnosticSkillEntry | null>(null);
	const [rejectionRemark, setRejectionRemark] = useState("");
	const [isSubmittingAction, setIsSubmittingAction] = useState(false);

	const filledCount = entries.filter(
		(e) => e.representativeDiagnosis || e.confidenceLevel || e.status !== "DRAFT"
	).length;
	const signedCount = entries.filter((e) => e.status === "SIGNED").length;

	const handleAddSkillPress = () => {
		setShowSelectSkillModal(true);
	};

	const handleConfirmAddSkill = async (skillName: string, slNo?: number) => {
		try {
			setShowSelectSkillModal(false);
			const res = await addRow(category.enumValue, skillName, slNo);
			refetchEntries();
			if (res?.entry) {
				setEditingEntry(res.entry);
			}
		} catch (e: any) {
			const msg =
				e?.response?.data?.error ||
				e?.response?.data?.message ||
				e?.message ||
				"Failed to add diagnostic skill entry.";
			Alert.alert("Notice", msg);
		}
	};

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
									imageUrls: [],
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
			{/* Top Header */}
			<View style={styles.subViewHeader}>
				<HStack align="center" justify="space-between">
					<HStack align="center" gap="2" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
						<Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
							<ArrowLeft size={22} color={Colors.foreground} />
						</Pressable>
						<VStack style={{ flex: 1, minWidth: 0 }}>
							<Heading level={3} numberOfLines={1}>
								{category.label}
							</Heading>
							<Text variant="muted" numberOfLines={1}>
								{entries.length} skills — tap to edit
							</Text>
						</VStack>
					</HStack>

					<View style={{ flexShrink: 0 }}>
						<ExportButton
							module="diagnostics"
							extraParams={{ category: category.enumValue }}
						/>
					</View>
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
							<VStack gap="2">
								<HStack align="center" justify="space-between">
									<VStack gap="1" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
										<Heading level={3} numberOfLines={1}>{category.label}</Heading>
										<Text variant="muted">
											{signedCount} of {entries.length} skills signed off
										</Text>
									</VStack>

									<HStack align="center" gap="2" style={{ flexShrink: 0 }}>
										<Badge label={`${filledCount}/${entries.length}`} tone="accent" />
										{userRole === "student" && (
											<Button
												label="Add Skill"
												variant="primary"
												size="sm"
												onPress={handleAddSkillPress}
												loading={isAddingRow}
											/>
										)}
									</HStack>
								</HStack>

								<View style={styles.trackBackground}>
									<View
										style={[
											styles.trackFill,
											{ width: `${entries.length > 0 ? (signedCount / entries.length) * 100 : 0}%` },
										]}
									/>
								</View>
							</VStack>
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

			{showSelectSkillModal && (
				<SelectDiagnosticSkillModal
					category={category}
					existingEntries={entries}
					visible={showSelectSkillModal}
					onClose={() => setShowSelectSkillModal(false)}
					onSelectSkill={(name, slNo) => handleConfirmAddSkill(name, slNo)}
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

function SelectDiagnosticSkillModal({
	category,
	existingEntries,
	visible,
	onClose,
	onSelectSkill,
}: {
	category: DiagnosticCategoryConfig;
	existingEntries: DiagnosticSkillEntry[];
	visible: boolean;
	onClose: () => void;
	onSelectSkill: (skillName: string, slNo?: number) => void;
}) {
	const [customSkillInput, setCustomSkillInput] = useState("");
	const [showCustomInput, setShowCustomInput] = useState(false);

	const predefinedList = PREDEFINED_DIAGNOSTIC_SKILLS[category.enumValue] || [];
	const existingNamesSet = new Set(
		existingEntries.map((e) => e.skillName.trim().toLowerCase())
	);

	const availableSkills = predefinedList.filter(
		(item) => !existingNamesSet.has(item.name.trim().toLowerCase())
	);

	const handleAddCustom = () => {
		if (!customSkillInput.trim()) {
			Alert.alert("Input Required", "Please enter a valid skill name.");
			return;
		}
		onSelectSkill(customSkillInput.trim());
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<View style={styles.selectModalContent}>
					<HStack align="center" justify="space-between" style={styles.editModalHeader}>
						<VStack style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
							<Text variant="muted">Select Skill to Add</Text>
							<Heading level={3} numberOfLines={1}>
								{category.label}
							</Heading>
						</VStack>
						<Pressable onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.mutedSoft} />
						</Pressable>
					</HStack>

					<ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
						{availableSkills.length > 0 ? (
							availableSkills.map((item) => (
								<Pressable
									key={item.slNo}
									onPress={() => onSelectSkill(item.name, item.slNo)}
									style={({ pressed }) => [
										styles.skillPickCard,
										pressed && styles.cardPressed,
									]}
								>
									<HStack align="center" justify="space-between">
										<HStack align="center" gap="2" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
											<Badge label={`SL ${item.slNo}`} tone="neutral" />
											<Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
												{item.name}
											</Text>
										</HStack>
										<Plus size={18} color={Colors.accent} />
									</HStack>
								</Pressable>
							))
						) : (
							<View style={styles.emptySkillsBox}>
								<CheckCircle2 size={24} color={Colors.success} />
								<Text variant="bodySm" color={Colors.muted} style={{ textAlign: "center" }}>
									All {predefinedList.length} standard skills for this category have already been added to your logbook.
								</Text>
							</View>
						)}

						{showCustomInput ? (
							<VStack gap="2" style={styles.customInputBox}>
								<Text variant="bodyStrong">Custom Skill Name</Text>
								<Input
									placeholder="e.g. Arterial Line Sampling / ABG"
									value={customSkillInput}
									onChangeText={setCustomSkillInput}
								/>
								<HStack justify="flex-end" gap="2">
									<Button label="Cancel" variant="ghost" size="sm" onPress={() => setShowCustomInput(false)} />
									<Button label="Add Custom Skill" variant="primary" size="sm" onPress={handleAddCustom} />
								</HStack>
							</VStack>
						) : (
							<Pressable style={styles.addCustomBtn} onPress={() => setShowCustomInput(true)}>
								<Plus size={16} color={Colors.accent} />
								<Text variant="bodyStrong" color={Colors.accent}>
									+ Add Custom Diagnostic Skill
								</Text>
							</Pressable>
						)}
					</ScrollView>

					<HStack justify="flex-end" style={styles.editModalFooter}>
						<Button label="Close" variant="ghost" size="sm" onPress={onClose} />
					</HStack>
				</View>
			</View>
		</Modal>
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

	const confConfig = CONFIDENCE_LEVELS.find((c) => c.value === entry.confidenceLevel);

	return (
		<Card variant="default" style={styles.entryCard}>
			<VStack gap="2">
				{/* Card Header */}
				<HStack align="center" justify="space-between" style={{ width: "100%" }}>
					<HStack align="center" gap="2" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
						<View style={{ flexShrink: 0 }}>
							<Badge label={`SL ${entry.slNo}`} tone="neutral" />
						</View>
						<Heading level={4} numberOfLines={1} style={{ flex: 1, flexShrink: 1 }}>
							{entry.skillName}
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

				{/* Entry Fields Display */}
				<VStack gap="1" style={styles.entryFieldsBox}>
					<HStack align="center" justify="space-between">
						<Text variant="muted">Confidence Level:</Text>
						{confConfig ? (
							<View
								style={[
									styles.dynamicConfBadge,
									{
										backgroundColor: confConfig.bgColor,
										borderColor: confConfig.borderColor,
									},
								]}
							>
								<Text
									variant="bodySm"
									style={{ color: confConfig.textColor, fontWeight: "600" }}
								>
									{confConfig.value} — {confConfig.description}
								</Text>
							</View>
						) : (
							<Text variant="muted" style={{ fontStyle: "italic" }}>
								Not selected
							</Text>
						)}
					</HStack>

					<HStack align="center" justify="space-between">
						<Text variant="muted">Total Performed (Tally):</Text>
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

					{/* Clinical Image Attachments Preview */}
					{entry.imageUrls && entry.imageUrls.length > 0 && (
						<VStack gap="1" style={{ marginTop: 4 }}>
							<HStack align="center" gap="1">
								<ImageIcon size={12} color={Colors.mutedSoft} />
								<Text variant="muted">Attached Images ({entry.imageUrls.length}):</Text>
							</HStack>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
								{entry.imageUrls.map((url, idx) => (
									<Image key={idx} source={{ uri: url }} style={styles.cardImageThumbnail} />
								))}
							</ScrollView>
						</VStack>
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
	const [skillName, setSkillName] = useState(entry.skillName);
	const [confidenceLevel, setConfidenceLevel] = useState<string | null>(entry.confidenceLevel);
	const [representativeDiagnosis, setRepresentativeDiagnosis] = useState(entry.representativeDiagnosis || "");
	const [tallyCount, setTallyCount] = useState<number>(entry.totalTimesPerformed ?? 0);
	const [imageUrls, setImageUrls] = useState<string[]>(entry.imageUrls || []);
	const [newImageUrl, setNewImageUrl] = useState("");
	const [showAddImageInput, setShowAddImageInput] = useState(false);
	const [facultyId, setFacultyId] = useState<string | null>(entry.facultyId);
	const [saving, setSaving] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);

	const handlePickGallery = async () => {
		if (imageUrls.length >= 3) {
			Alert.alert("Limit Reached", "Maximum 3 clinical images allowed per diagnostic entry.");
			return;
		}
		try {
			setIsUploadingImage(true);
			const url = await pickAndUploadImageToCloudinary("diagnostics");
			if (url) {
				setImageUrls((prev) => [...prev, url]);
			}
		} catch (e: any) {
			Alert.alert("Upload Error", e.message || "Failed to upload image to Cloudinary.");
		} finally {
			setIsUploadingImage(false);
		}
	};

	const handleCaptureCamera = async () => {
		if (imageUrls.length >= 3) {
			Alert.alert("Limit Reached", "Maximum 3 clinical images allowed per diagnostic entry.");
			return;
		}
		try {
			setIsUploadingImage(true);
			const url = await captureAndUploadImageToCloudinary("diagnostics");
			if (url) {
				setImageUrls((prev) => [...prev, url]);
			}
		} catch (e: any) {
			Alert.alert("Upload Error", e.message || "Failed to capture and upload photo to Cloudinary.");
		} finally {
			setIsUploadingImage(false);
		}
	};

	const handleAddImageUrl = () => {
		if (!newImageUrl.trim()) return;
		if (imageUrls.length >= 3) {
			Alert.alert("Limit Reached", "Maximum 3 clinical images allowed per diagnostic entry.");
			return;
		}
		setImageUrls([...imageUrls, newImageUrl.trim()]);
		setNewImageUrl("");
		setShowAddImageInput(false);
	};

	const handleRemoveImage = (index: number) => {
		setImageUrls(imageUrls.filter((_, idx) => idx !== index));
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			await onSave({
				skillName: entry.skillName,
				confidenceLevel,
				representativeDiagnosis: representativeDiagnosis.trim() || null,
				totalTimesPerformed: tallyCount,
				imageUrls,
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
					{/* Modal Header */}
					<HStack align="center" justify="space-between" style={styles.editModalHeader}>
						<VStack style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
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

					<ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
						{/* 1. Read-only Skill Title Banner */}
						<Card variant="flat" style={styles.readOnlySkillBanner}>
							<VStack gap="1">
								<Text variant="muted">Diagnostic Skill Title (Read-Only)</Text>
								<HStack align="center" gap="2">
									<Lock size={16} color={Colors.accent} />
									<Text variant="bodyStrong" style={{ flex: 1 }}>
										{entry.skillName}
									</Text>
								</HStack>
							</VStack>
						</Card>

						{/* 2. Level of Confidence Chips — Dynamic Colors */}
						<VStack gap="2">
							<Text variant="bodyStrong">Level of Confidence</Text>
							<HStack gap="2" style={{ flexWrap: "wrap" }}>
								{CONFIDENCE_LEVELS.map((c) => {
									const isSelected = confidenceLevel === c.value;
									return (
										<Pressable
											key={c.value}
											onPress={() => setConfidenceLevel(c.value)}
											style={[
												styles.dynamicChoiceChip,
												{
													backgroundColor: isSelected ? c.bgColor : Colors.surface,
													borderColor: isSelected ? c.borderColor : Colors.mutedSoft,
												},
											]}
										>
											<Text
												variant="bodySm"
												style={{
													color: isSelected ? c.textColor : Colors.foreground,
													fontWeight: isSelected ? "700" : "400",
												}}
											>
												{c.value} ({c.description})
											</Text>
										</Pressable>
									);
								})}
							</HStack>
						</VStack>

						{/* 3. Representative Diagnosis */}
						<Input
							label="Representative Diagnosis"
							placeholder="Enter representative clinical diagnosis..."
							value={representativeDiagnosis}
							onChangeText={setRepresentativeDiagnosis}
							multiline
							numberOfLines={3}
						/>

						{/* 4. Total Times Performed (Tally) with Stepper */}
						<VStack gap="2">
							<Text variant="bodyStrong">Total Times Performed (Tally)</Text>
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

						{/* 5. Clinical Images Upload / Preview Grid (0/3 max) */}
						<VStack gap="2">
							<HStack align="center" justify="space-between">
								<Text variant="bodyStrong">Clinical Images / Scans</Text>
								<Badge label={`${imageUrls.length}/3 files`} tone="neutral" />
							</HStack>

							{imageUrls.length > 0 && (
								<HStack gap="2" style={{ flexWrap: "wrap" }}>
									{imageUrls.map((url, idx) => (
										<View key={idx} style={styles.imagePreviewWrapper}>
											<Image source={{ uri: url }} style={styles.imagePreview} />
											<Pressable
												style={styles.removeImageBtn}
												onPress={() => handleRemoveImage(idx)}
												hitSlop={6}
											>
												<X size={12} color={Colors.surface} />
											</Pressable>
										</View>
									))}
								</HStack>
							)}

							{isUploadingImage ? (
								<HStack align="center" justify="center" gap="2" style={styles.uploadingBox}>
									<ActivityIndicator size="small" color={Colors.accent} />
									<Text variant="bodySm" color={Colors.accent}>
										Uploading image to Cloudinary...
									</Text>
								</HStack>
							) : showAddImageInput ? (
								<VStack gap="2" style={styles.addImageBox}>
									<Input
										placeholder="Enter Image / Photo URL..."
										value={newImageUrl}
										onChangeText={setNewImageUrl}
									/>
									<HStack justify="flex-end" gap="2">
										<Button label="Cancel" variant="ghost" size="sm" onPress={() => setShowAddImageInput(false)} />
										<Button label="Attach URL" variant="primary" size="sm" onPress={handleAddImageUrl} />
									</HStack>
								</VStack>
							) : (
								imageUrls.length < 3 && (
									<VStack gap="2">
										<HStack gap="2">
											<Pressable style={[styles.uploadDashedBox, { flex: 1 }]} onPress={handleCaptureCamera}>
												<Camera size={18} color={Colors.accent} />
												<Text variant="bodySm" color={Colors.accent} style={{ fontWeight: "600" }}>
													Take Photo
												</Text>
											</Pressable>

											<Pressable style={[styles.uploadDashedBox, { flex: 1 }]} onPress={handlePickGallery}>
												<ImageIcon size={18} color={Colors.accent} />
												<Text variant="bodySm" color={Colors.accent} style={{ fontWeight: "600" }}>
													Choose Gallery
												</Text>
											</Pressable>
										</HStack>

										<Pressable onPress={() => setShowAddImageInput(true)} style={{ alignSelf: "center", marginTop: 2 }}>
											<Text variant="bodySm" color={Colors.muted} style={{ textDecorationLine: "underline" }}>
												Or paste direct image URL
											</Text>
										</Pressable>
									</VStack>
								)
							)}
						</VStack>

						{/* 6. Supervising Faculty Selection */}
						<VStack gap="2">
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

					{/* Modal Action Footer */}
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
	dynamicConfBadge: {
		paddingHorizontal: Spacing["2"],
		paddingVertical: 4,
		borderRadius: Radius.md,
		borderWidth: 1,
	},
	diagnosisText: {
		color: Colors.foreground,
		fontStyle: "italic",
	},
	cardImageThumbnail: {
		width: 48,
		height: 48,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
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
	selectModalContent: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing["4"],
		gap: Spacing["3"],
	},
	skillPickCard: {
		backgroundColor: Colors.surfaceMuted,
		borderRadius: Radius.md,
		padding: Spacing["3"],
		borderWidth: 1,
		borderColor: Colors.border,
	},
	emptySkillsBox: {
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing["4"],
		gap: 8,
		backgroundColor: Colors.surfaceMuted,
		borderRadius: Radius.lg,
	},
	customInputBox: {
		backgroundColor: Colors.surfaceMuted,
		padding: Spacing["3"],
		borderRadius: Radius.lg,
		marginTop: 4,
	},
	addCustomBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		padding: Spacing["3"],
		borderRadius: Radius.md,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: Colors.accent,
		backgroundColor: Colors.accent + "10",
		marginTop: 4,
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
	readOnlySkillBanner: {
		backgroundColor: Colors.surfaceMuted,
		padding: Spacing["3"],
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	dynamicChoiceChip: {
		paddingHorizontal: Spacing["3"],
		paddingVertical: 8,
		borderRadius: Radius.md,
		borderWidth: 1,
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
	uploadDashedBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		padding: Spacing["3"],
		borderRadius: Radius.lg,
		borderWidth: 1.5,
		borderStyle: "dashed",
		borderColor: Colors.accent,
		backgroundColor: Colors.accent + "0D",
	},
	addImageBox: {
		backgroundColor: Colors.surfaceMuted,
		padding: Spacing["3"],
		borderRadius: Radius.md,
	},
	uploadingBox: {
		backgroundColor: Colors.accent + "15",
		padding: Spacing["3"],
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.accent + "40",
	},
	imagePreviewWrapper: {
		position: "relative",
	},
	imagePreview: {
		width: 60,
		height: 60,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	removeImageBtn: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: Colors.danger,
		borderRadius: Radius.pill,
		padding: 3,
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
