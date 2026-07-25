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
import DateTimePicker from "@react-native-community/datetimepicker";
import {
	AlertTriangle,
	ArrowLeft,
	Calendar as CalendarIcon,
	Camera,
	CheckCircle2,
	ChevronRight,
	Image as ImageIcon,
	Lock,
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
import {
	pickAndUploadImageToCloudinary,
	captureAndUploadImageToCloudinary,
} from "@/lib/utils/cloudinary";
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

const LOCATION_OPTIONS = ["ER", "ICU", "OR", "Ward", "Radiology", "Trauma Bay", "OPD"];
const SEX_OPTIONS = ["Male", "Female", "Other"];

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
						<VStack style={{ flex: 1, minWidth: 0 }}>
							<Heading level={2}>Imaging Logs</Heading>
							<Text variant="muted" numberOfLines={1}>
								Ultrasound, POCUS, X-Ray, CT & MRI Analysis
							</Text>
						</VStack>
					</HStack>

					<Card variant="flat" style={styles.infoCard}>
						<VStack gap="1">
							<Text variant="bodyStrong" color={Colors.accent}>
								Skill Level Progression (S/O/A/PS/PI)
							</Text>
							<Text variant="bodySm" color={Colors.muted}>
								Log imaging studies across 5 levels: S (Simulation), O (Observed), A (Assisted), PS (Performed under Supervision), PI (Performed Independently).
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
									<IconBubble icon={<ImageIcon size={18} color={Colors.surface} />} tone="accent" size={32} />
									<Badge label={`Code ${item.code} • Max ${item.maxEntries}`} tone="neutral" />
								</HStack>
								<ChevronRight size={20} color={Colors.mutedSoft} />
							</HStack>

							<VStack gap="1">
								<Heading level={3}>{item.label}</Heading>
							</VStack>

							<VStack gap="1">
								<HStack align="center" justify="space-between">
									<Text variant="bodySm">
										{filledCount} of {item.maxEntries} entries logged
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
			Alert.alert(
				"Capacity Reached",
				`All ${category.maxEntries} entry rows for ${category.label} have already been added to your logbook.`
			);
			return;
		}
		try {
			const newEntry = await addRow(category.enumValue);
			refetchEntries();
			if (newEntry) {
				setEditingEntry(newEntry);
			}
		} catch (e: any) {
			const msg =
				e?.response?.data?.error ||
				e?.response?.data?.message ||
				e?.message ||
				`All ${category.maxEntries} entry rows for ${category.label} have already been added to your logbook.`;
			Alert.alert("Notice", msg);
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
									totalProcedureTally: 0,
									imageUrls: [],
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
								{entries.length} of {category.maxEntries} entries — tap to edit
							</Text>
						</VStack>
					</HStack>

					<View style={{ flexShrink: 0 }}>
						<ExportButton
							module="imaging"
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
											{signedCount} of {entries.length} entries signed off
										</Text>
									</VStack>

									<HStack align="center" gap="2" style={{ flexShrink: 0 }}>
										<Badge label={`${filledCount}/${entries.length}`} tone="accent" />
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
											{ width: `${entries.length > 0 ? (signedCount / entries.length) * 100 : 0}%` },
										]}
									/>
								</View>
							</VStack>
						</Card>
					}
					renderItem={({ item }) => (
						<ImagingLogCard
							entry={item}
							categoryLabel={category.label}
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
					category={category}
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
									Specify revision details for entry Sl No: {rejectionModalEntry.slNo}.
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
	categoryLabel,
	userRole,
	onEdit,
	onClear,
	onSubmit,
	onSign,
	onReject,
	isSubmitting,
}: {
	entry: ImagingLogEntry;
	categoryLabel: string;
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
							{entry.patientName || `${categoryLabel} #${entry.slNo}`}
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
							<Text variant="muted">Procedure / Findings:</Text>
							<Text variant="bodySm">{entry.procedureDescription}</Text>
						</VStack>
					)}

					{(entry.totalProcedureTally ?? entry.totalImagingTally ?? 0) > 0 && (
						<HStack align="center" justify="space-between">
							<Text variant="muted">Total Tally:</Text>
							<Text variant="bodyStrong">
								{entry.totalProcedureTally ?? entry.totalImagingTally} times
							</Text>
						</HStack>
					)}

					{/* Clinical Scan Image Thumbnails Preview */}
					{entry.imageUrls && entry.imageUrls.length > 0 && (
						<VStack gap="1" style={{ marginTop: 4 }}>
							<HStack align="center" gap="1">
								<ImageIcon size={12} color={Colors.mutedSoft} />
								<Text variant="muted">Attached Scans ({entry.imageUrls.length}):</Text>
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

function ImagingLogEditModal({
	entry,
	category,
	facultyList,
	visible,
	onClose,
	onSave,
}: {
	entry: ImagingLogEntry;
	category: ImagingCategoryConfig;
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
	const [tallyCount, setTallyCount] = useState<number>(entry.totalProcedureTally ?? entry.totalImagingTally ?? 0);
	const [imageUrls, setImageUrls] = useState<string[]>(entry.imageUrls || []);
	const [newImageUrl, setNewImageUrl] = useState("");
	const [showAddImageInput, setShowAddImageInput] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [facultyId, setFacultyId] = useState<string | null>(entry.facultyId);
	const [saving, setSaving] = useState(false);

	const handlePickGallery = async () => {
		if (imageUrls.length >= 3) {
			Alert.alert("Limit Reached", "Maximum 3 scan photos allowed per imaging log.");
			return;
		}
		try {
			setIsUploadingImage(true);
			const url = await pickAndUploadImageToCloudinary("imaging");
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
			Alert.alert("Limit Reached", "Maximum 3 scan photos allowed per imaging log.");
			return;
		}
		try {
			setIsUploadingImage(true);
			const url = await captureAndUploadImageToCloudinary("imaging");
			if (url) {
				setImageUrls((prev) => [...prev, url]);
			}
		} catch (e: any) {
			Alert.alert("Upload Error", e.message || "Failed to capture photo to Cloudinary.");
		} finally {
			setIsUploadingImage(false);
		}
	};

	const handleAddImageUrl = () => {
		if (!newImageUrl.trim()) return;
		if (imageUrls.length >= 3) {
			Alert.alert("Limit Reached", "Maximum 3 scan photos allowed per imaging log.");
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
				imageUrls,
				facultyId,
				imagingCategory: category.enumValue,
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
					{/* Header */}
					<HStack align="center" justify="space-between" style={styles.editModalHeader}>
						<VStack style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
							<Text variant="muted">Edit Imaging Log — Sl {entry.slNo}</Text>
							<Heading level={3} numberOfLines={1}>
								{category.label}
							</Heading>
						</VStack>
						<Pressable onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.mutedSoft} />
						</Pressable>
					</HStack>

					<ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
						{/* 1. Date Picker */}
						<VStack gap="1">
							<Text variant="bodyStrong">Investigation Date</Text>
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

						{/* 5. Procedure / Imaging Description */}
						<Input
							label="Procedure / Imaging Findings"
							placeholder="Describe ultrasound / X-ray / CT / MRI findings..."
							value={procedureDescription}
							onChangeText={setProcedureDescription}
							multiline
							numberOfLines={3}
						/>

						{/* 6. Performed Location (Dynamic Input + Preset Chips) */}
						<VStack gap="2">
							<Input
								label="Performed Location"
								placeholder="e.g. ER, ICU, Trauma Bay, Ward 4B, Radiology..."
								value={performedAtLocation}
								onChangeText={setPerformedAtLocation}
							/>
							<VStack gap="1">
								<Text variant="bodySm" color={Colors.muted}>Quick Location Presets:</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
									{LOCATION_OPTIONS.map((loc) => {
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
							<Text variant="bodyStrong">Total Procedures Performed (Tally)</Text>
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

						{/* 8. Clinical Scan Photo Attachments */}
						<VStack gap="2">
							<HStack align="center" justify="space-between">
								<Text variant="bodyStrong">Clinical Scan Photos / Reports</Text>
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
										Uploading scan image to Cloudinary...
									</Text>
								</HStack>
							) : showAddImageInput ? (
								<VStack gap="2" style={styles.addImageBox}>
									<Input
										placeholder="Enter Image / Scan URL..."
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
												Or paste direct scan image URL
											</Text>
										</Pressable>
									</VStack>
								)
							)}
						</VStack>

						{/* 9. Supervising Faculty Selection */}
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
