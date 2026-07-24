/**
 * Clinical Skills Training screen — Mobile implementation for PG Logbook.
 * Module: "LOG OF CLINICAL SKILL TRAINING"
 * Features:
 * - Adult Patient & Pediatric Patient category switcher
 * - Progress card (X of 10 skills signed off)
 * - 10 fixed skills list with Sl No, skill name, representative diagnosis, confidence level badge
 * - Inline edit modal & submission for review
 * - Rejection reason banner under rejected entries
 * - Faculty sign-off / rejection workflows with real-time push notifications
 * - Export Adult / Export Pediatric PDF & Excel engine
 */

import React, { useState } from "react";
import {
	Alert,
	FlatList,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import {
	AlertTriangle,
	ArrowLeft,
	Award,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Edit3,
	FileText,
	Info,
	Send,
	User,
	X,
	Zap,
} from "lucide-react-native";

import {
	Badge,
	Button,
	Card,
	Divider,
	ExportButton,
	Heading,
	HStack,
	Input,
	Screen,
	StatusBadge,
	Text,
	VStack,
} from "@/components/ui";
import {
	useClinicalSkills,
	ClinicalSkillItem,
	SkillCategory,
	FacultyOption,
} from "@/lib/hooks/useClinicalSkills";
import { useMe } from "@/lib/hooks/useMe";
import { Colors, Radius, Spacing } from "@/lib/theme";

const CONFIDENCE_LEVELS = [
	{ key: "VERY_CONFIDENT", label: "Very Confident (VC)", badgeTone: "signed" as const },
	{ key: "FAIRLY_CONFIDENT", label: "Fairly Confident (FC)", badgeTone: "info" as const },
	{ key: "JUST_CONFIDENT", label: "Just Confident (JC)", badgeTone: "warning" as const },
	{ key: "NOT_CONFIDENT", label: "Not Confident (NC)", badgeTone: "draft" as const },
];

function getConfidenceBadge(level: string | null) {
	if (!level) return { label: "—", tone: "draft" as const };
	const found = CONFIDENCE_LEVELS.find(
		(c) => c.key === level || c.label.toLowerCase().includes(level.toLowerCase())
	);
	if (found) return { label: found.label, tone: found.badgeTone };

	if (level.includes("VC") || level.includes("Very")) {
		return { label: "Very Confident (VC)", tone: "signed" as const };
	}
	if (level.includes("FC") || level.includes("Fairly")) {
		return { label: "Fairly Confident (FC)", tone: "info" as const };
	}
	if (level.includes("JC") || level.includes("Just")) {
		return { label: "Just Confident (JC)", tone: "warning" as const };
	}
	return { label: level, tone: "info" as const };
}

export default function ClinicalSkillsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const isFacultyOrHod = me?.role === "faculty" || me?.role === "hod";

	// Active Category Tab: "adult" | "pediatric"
	const [activeCategory, setActiveCategory] = useState<SkillCategory>("adult");

	const {
		skills,
		faculty,
		signedCount,
		totalCount,
		isLoading,
		refetch,
		updateSkill,
		submitSkill,
		signSkill,
		rejectSkill,
		isUpdating,
		isSubmitting,
		isSigning,
		isRejecting,
	} = useClinicalSkills({
		type: activeCategory,
		mode: isFacultyOrHod ? "review" : undefined,
	});

	// Inline Edit Modal State
	const [editingSkill, setEditingSkill] = useState<ClinicalSkillItem | null>(null);
	const [editDiagnosis, setEditDiagnosis] = useState("");
	const [editConfidence, setEditConfidence] = useState<string | null>(null);
	const [editTimesPerformed, setEditTimesPerformed] = useState("0");
	const [editFacultyId, setEditFacultyId] = useState<string | null>(null);
	const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

	// Faculty Reject Modal State
	const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Open Edit Modal Handler
	const handleOpenEdit = (skill: ClinicalSkillItem) => {
		setEditingSkill(skill);
		setEditDiagnosis(skill.representativeDiagnosis || "");
		setEditConfidence(skill.confidenceLevel || null);
		setEditTimesPerformed((skill.totalTimesPerformed ?? 0).toString());
		setEditFacultyId(skill.facultyId || null);
		setShowFacultyDropdown(false);
	};

	// Save Skill Handler
	const handleSaveSkill = async (andSubmit = false) => {
		if (!editingSkill) return;
		const timesNum = parseInt(editTimesPerformed, 10) || 0;

		try {
			await updateSkill({
				id: editingSkill.id,
				data: {
					representativeDiagnosis: editDiagnosis.trim() || null,
					confidenceLevel: editConfidence,
					totalTimesPerformed: timesNum,
					facultyId: editFacultyId,
				},
			});

			if (andSubmit) {
				await submitSkill(editingSkill.id);
				Alert.alert("Submitted", "Clinical skill submitted for faculty review.");
			} else {
				Alert.alert("Saved", "Skill entry updated successfully.");
			}

			setEditingSkill(null);
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to update skill");
		}
	};

	// Direct Submit Handler
	const handleSubmitDirect = async (skill: ClinicalSkillItem) => {
		try {
			await submitSkill(skill.id);
			Alert.alert("Submitted", `Skill "${skill.skillName}" submitted for review.`);
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to submit skill");
		}
	};

	// Faculty Sign Off Handler
	const handleFacultySign = async (skill: ClinicalSkillItem) => {
		try {
			await signSkill({ id: skill.id });
			Alert.alert("Signed Off", `Skill "${skill.skillName}" signed off successfully.`);
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to sign off skill");
		}
	};

	// Faculty Reject Handler
	const handleDoReject = async () => {
		if (!rejectTargetId) return;
		if (!rejectRemark.trim()) {
			Alert.alert("Required", "Please enter a reason for requesting revision.");
			return;
		}
		try {
			await rejectSkill({ id: rejectTargetId, remark: rejectRemark.trim() });
			Alert.alert("Revision Requested", "Skill entry sent back to resident for revision.");
			setRejectTargetId(null);
			setRejectRemark("");
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to reject skill");
		}
	};

	// Progress percentage for header progress bar
	const progressPct = totalCount > 0 ? Math.min(100, Math.round((signedCount / totalCount) * 100)) : 0;

	return (
		<Screen bleed>
			<FlatList
				data={skills}
				keyExtractor={(item) => item.id}
				refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[Colors.accent]} />}
				ListHeaderComponent={
					<View style={styles.headerContainer}>
						{/* Top App Bar */}
						<HStack style={styles.topBar}>
							<Pressable onPress={() => router.back()} style={styles.iconBtn}>
								<ArrowLeft size={20} color={Colors.foreground} />
							</Pressable>
							<VStack style={styles.flex1}>
								<Heading level={4}>Clinical Skills Training</Heading>
								<Text style={styles.topSubtitle}>
									Track your clinical examination skills for Adult and Pediatric patients
								</Text>
							</VStack>
							<ExportButton
								module="clinical-skills"
								label={activeCategory === "adult" ? "Export Adult" : "Export Pediatric"}
								extraParams={{ type: activeCategory }}
							/>
						</HStack>

						{/* Category Switcher Tabs */}
						<View style={styles.categoryTabContainer}>
							<Pressable
								onPress={() => setActiveCategory("adult")}
								style={[styles.categoryTabBtn, activeCategory === "adult" && styles.categoryTabBtnActive]}
							>
								<Text style={[styles.categoryTabText, activeCategory === "adult" && styles.categoryTabTextActive]}>
									Adult Patient
								</Text>
							</Pressable>

							<Pressable
								onPress={() => setActiveCategory("pediatric")}
								style={[styles.categoryTabBtn, activeCategory === "pediatric" && styles.categoryTabBtnActive]}
							>
								<Text style={[styles.categoryTabText, activeCategory === "pediatric" && styles.categoryTabTextActive]}>
									Pediatric Patient
								</Text>
							</Pressable>
						</View>

						{/* Progress Card (Matching Web Screenshot) */}
						<Card style={styles.progressCard}>
							<VStack style={styles.progressStack}>
								<HStack style={styles.progressHeaderRow}>
									<VStack style={styles.flex1}>
										<Heading level={4} style={styles.progressTitle}>
											Clinical Skills — {activeCategory === "adult" ? "Adult Patient" : "Pediatric Patient"}
										</Heading>
										<Text style={styles.progressSubText}>
											{signedCount} of {totalCount} skills signed off
										</Text>
									</VStack>

									<View style={styles.progressBadge}>
										<Text style={styles.progressBadgeText}>{signedCount}/{totalCount}</Text>
									</View>
								</HStack>

								{/* Progress Bar */}
								<View style={styles.progressBarTrack}>
									<View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
								</View>
							</VStack>
						</Card>
					</View>
				}
				renderItem={({ item }) => (
					<SkillRowCard
						item={item}
						isFacultyOrHod={isFacultyOrHod}
						facultyList={faculty}
						onOpenEdit={() => handleOpenEdit(item)}
						onSubmitDirect={() => handleSubmitDirect(item)}
						onFacultySign={() => handleFacultySign(item)}
						onFacultyReject={() => {
							setRejectTargetId(item.id);
							setRejectRemark("");
						}}
					/>
				)}
				ListEmptyComponent={
					<Card style={styles.emptyCard}>
						<VStack style={styles.emptyStack}>
							<Zap size={44} color={Colors.accent} />
							<Heading level={4}>No Clinical Skills Found</Heading>
							<Text style={styles.emptySub}>
								Skills will auto-initialize for your profile when accessing this module.
							</Text>
						</VStack>
					</Card>
				}
				contentContainerStyle={styles.listContent}
			/>

			{/* ======================== INLINE EDIT MODAL ======================== */}
			<Modal visible={Boolean(editingSkill)} animationType="slide" transparent onRequestClose={() => setEditingSkill(null)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack style={styles.flex1}>
								<HStack style={styles.centerRow}>
									<View style={styles.slNoPill}>
										<Text style={styles.slNoPillText}>Sl. {editingSkill?.slNo}</Text>
									</View>
									<Heading level={4} style={styles.flex1}>{editingSkill?.skillName}</Heading>
								</HStack>
								<Text style={styles.modalSub}>
									Category: {activeCategory === "adult" ? "Adult Patient" : "Pediatric Patient"}
								</Text>
							</VStack>
							<Pressable onPress={() => setEditingSkill(null)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
							<VStack style={styles.formGap}>
								{/* Representative Clinical Diagnosis Input */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Representative Patient Clinical Diagnosis</Text>
									<Input
										placeholder="e.g. Acute Appendicitis, Pneumonia, Head Injury..."
										value={editDiagnosis}
										onChangeText={setEditDiagnosis}
										multiline
										numberOfLines={3}
										style={styles.multilineInput}
									/>
								</VStack>

								{/* Confidence Level Selector Chips */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Confidence Level</Text>
									<VStack style={styles.confidenceChipsCol}>
										{CONFIDENCE_LEVELS.map((chip) => {
											const active = editConfidence === chip.key || editConfidence === chip.label;
											return (
												<Pressable
													key={chip.key}
													onPress={() => setEditConfidence(chip.key)}
													style={[styles.confidenceChip, active && styles.confidenceChipActive]}
												>
													<HStack style={styles.centerRow}>
														<Badge label={chip.label} tone={chip.badgeTone} />
														{active && <Check size={16} color={Colors.accent} />}
													</HStack>
												</Pressable>
											);
										})}
									</VStack>
								</VStack>

								{/* Total Times Performed Input */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Total Times Performed</Text>
									<Input
										placeholder="e.g. 5"
										value={editTimesPerformed}
										onChangeText={setEditTimesPerformed}
										keyboardType="numeric"
									/>
								</VStack>

								{/* Supervising Faculty Select */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Supervising Faculty</Text>
									<Pressable
										onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
										style={styles.facultyDropdownBtn}
									>
										<HStack style={styles.spaceBetween}>
											<Text style={styles.facultyDropdownText}>
												{editFacultyId
													? (faculty.find((f) => f.id === editFacultyId)
															? `Dr. ${faculty.find((f) => f.id === editFacultyId)?.firstName} ${faculty.find((f) => f.id === editFacultyId)?.lastName}`
															: "Faculty Selected")
													: "Select Observing Faculty"}
											</Text>
											<ChevronDown size={16} color={Colors.muted} />
										</HStack>
									</Pressable>

									{showFacultyDropdown && (
										<View style={styles.facultyDropdownList}>
											<ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
												{faculty.map((f) => (
													<Pressable
														key={f.id}
														onPress={() => {
															setEditFacultyId(f.id);
															setShowFacultyDropdown(false);
														}}
														style={styles.facultyDropdownItem}
													>
														<Text style={styles.facultyItemText}>Dr. {f.firstName} {f.lastName}</Text>
													</Pressable>
												))}
											</ScrollView>
										</View>
									)}
								</VStack>
							</VStack>
						</ScrollView>

						{/* Footer Actions */}
						<HStack style={styles.modalFooter}>
							<Button
								label={isUpdating ? "Saving..." : "Save Draft"}
								variant="secondary"
								onPress={() => handleSaveSkill(false)}
								disabled={isUpdating || isSubmitting}
								style={styles.modalCancelBtn}
							/>
							<Button
								label={isSubmitting ? "Submitting..." : "Save & Submit"}
								onPress={() => handleSaveSkill(true)}
								disabled={isUpdating || isSubmitting}
								style={styles.modalSaveBtn}
							/>
						</HStack>
					</View>
				</View>
			</Modal>

			{/* ======================== REJECT REASON MODAL ======================== */}
			<Modal visible={Boolean(rejectTargetId)} animationType="fade" transparent onRequestClose={() => setRejectTargetId(null)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack style={styles.flex1}>
								<Heading level={4}>Request Revision</Heading>
								<Text style={styles.modalSub}>Provide instructions for the resident to resubmit</Text>
							</VStack>
							<Pressable onPress={() => setRejectTargetId(null)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<VStack style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Rejection / Revision Reason *</Text>
							<Input
								placeholder="e.g. Please update representative diagnosis with complete clinical findings..."
								value={rejectRemark}
								onChangeText={setRejectRemark}
								multiline
								numberOfLines={3}
								style={styles.multilineInput}
							/>
						</VStack>

						<HStack style={styles.modalFooter}>
							<Button label="Cancel" variant="secondary" onPress={() => setRejectTargetId(null)} style={styles.modalCancelBtn} />
							<Button
								label={isRejecting ? "Sending..." : "Send Revision"}
								variant="danger"
								onPress={handleDoReject}
								disabled={isRejecting}
								style={styles.modalSaveBtn}
							/>
						</HStack>
					</View>
				</View>
			</Modal>
		</Screen>
	);
}

/**
 * Skill Row Item Card Component (Matching Web Table Structure)
 */
function SkillRowCard({
	item,
	isFacultyOrHod,
	facultyList,
	onOpenEdit,
	onSubmitDirect,
	onFacultySign,
	onFacultyReject,
}: {
	item: ClinicalSkillItem;
	isFacultyOrHod: boolean;
	facultyList: FacultyOption[];
	onOpenEdit: () => void;
	onSubmitDirect: () => void;
	onFacultySign: () => void;
	onFacultyReject: () => void;
}) {
	const confidence = getConfidenceBadge(item.confidenceLevel);
	const isSigned = item.status === "SIGNED";
	const isSubmitted = item.status === "SUBMITTED";
	const isNeedsRevision = item.status === "NEEDS_REVISION";

	const facultyObj = facultyList.find((f) => f.id === item.facultyId);
	const facultyName = facultyObj ? `Dr. ${facultyObj.firstName} ${facultyObj.lastName}` : "—";

	return (
		<Card style={[styles.cardItem, isSigned && styles.signedCardBorder]}>
			{/* Header: Sl No + Skill Title + Status Badge */}
			<HStack style={styles.cardHeader}>
				<View style={styles.slBadge}>
					<Text style={styles.slBadgeText}>{item.slNo}</Text>
				</View>
				<VStack style={styles.flex1}>
					<Heading level={4} style={styles.skillTitle}>{item.skillName}</Heading>
					{Boolean(item.user) && (
						<Text style={styles.studentSub}>
							Resident: Dr. {item.user?.firstName} {item.user?.lastName} ({item.user?.batchRelation?.name || "Batch"})
						</Text>
					)}
				</VStack>
				<StatusBadge status={item.status as any} />
			</HStack>

			<Divider style={styles.cardDivider} />

			{/* Main Details: Diagnosis & Confidence Badge */}
			<VStack style={styles.detailsBlock}>
				<VStack style={styles.detailRow}>
					<Text style={styles.detailLabel}>Representative Patient Clinical Diagnosis:</Text>
					<Text style={[styles.detailValue, !item.representativeDiagnosis && styles.notFilledText]}>
						{item.representativeDiagnosis ? `- ${item.representativeDiagnosis}` : "Not filled"}
					</Text>
				</VStack>

				<HStack style={styles.spaceBetweenCenter}>
					<VStack style={styles.detailRow}>
						<Text style={styles.detailLabel}>Confidence Level:</Text>
						<Badge label={confidence.label} tone={confidence.tone} />
					</VStack>

					<VStack style={styles.detailRowRight}>
						<Text style={styles.detailLabel}>Times Performed:</Text>
						<Text style={styles.timesText}>{item.totalTimesPerformed ?? 0} times</Text>
					</VStack>
				</HStack>
			</VStack>

			{/* Rejection Reason Banner (Matching Web Screenshot 1) */}
			{isNeedsRevision && Boolean(item.facultyRemark) && (
				<View style={styles.rejectionBanner}>
					<HStack style={styles.rejectionHeader}>
						<AlertTriangle size={14} color={Colors.danger} />
						<Text style={styles.rejectionTitle}>Rejection Reason:</Text>
					</HStack>
					<Text style={styles.rejectionText}>{item.facultyRemark}</Text>
				</View>
			)}

			<Divider style={styles.cardDivider} />

			{/* Footer Actions */}
			<HStack style={styles.cardFooter}>
				{!isFacultyOrHod ? (
					!isSigned && (
						<>
							<Button
								label="Edit Skill"
								variant="secondary"
								size="sm"
								leftIcon={<Edit3 size={14} color={Colors.foreground} />}
								onPress={onOpenEdit}
							/>
							{item.status === "DRAFT" || isNeedsRevision ? (
								<Button
									label="Submit"
									size="sm"
									leftIcon={<Send size={14} color="#FFF" />}
									onPress={onSubmitDirect}
								/>
							) : null}
						</>
					)
				) : (
					isSubmitted && (
						<>
							<Button
								label="Request Revision"
								variant="secondary"
								size="sm"
								leftIcon={<AlertTriangle size={14} color={Colors.danger} />}
								onPress={onFacultyReject}
							/>
							<Button
								label="Sign Off"
								size="sm"
								leftIcon={<CheckCircle2 size={14} color="#FFF" />}
								onPress={onFacultySign}
							/>
						</>
					)
				)}
			</HStack>
		</Card>
	);
}

const styles = StyleSheet.create({
	flex1: { flex: 1 },
	centerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	spaceBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	spaceBetweenCenter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
	listContent: { paddingBottom: 32 },

	// Header Bar & Subtitle
	headerContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
	topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
	iconBtn: { padding: 8, borderRadius: Radius.sm, backgroundColor: Colors.surface },
	topSubtitle: { fontSize: 12, color: Colors.muted },

	// Category Switcher Tabs
	categoryTabContainer: {
		flexDirection: "row",
		backgroundColor: Colors.surfaceMuted,
		padding: 4,
		borderRadius: Radius.pill,
		marginVertical: 4,
	},
	categoryTabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: Radius.pill },
	categoryTabBtnActive: {
		backgroundColor: Colors.surface,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	categoryTabText: { fontSize: 13, fontWeight: "600", color: Colors.muted },
	categoryTabTextActive: { color: Colors.accent, fontWeight: "700" },

	// Progress Card (Web Screenshot 1 & 2)
	progressCard: { padding: 16, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
	progressStack: { gap: 10 },
	progressHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
	progressTitle: { fontSize: 15, fontWeight: "700" },
	progressSubText: { fontSize: 12, color: Colors.muted, marginTop: 2 },
	progressBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceMuted,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	progressBadgeText: { fontSize: 13, fontWeight: "700", color: Colors.foreground },

	progressBarTrack: { height: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.pill, overflow: "hidden" },
	progressBarFill: { height: "100%", backgroundColor: "#059669", borderRadius: Radius.pill },

	// Skill Row Card
	cardItem: {
		marginHorizontal: 16,
		marginTop: 12,
		padding: 16,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: 10,
	},
	signedCardBorder: { borderColor: "#A7F3D0", borderWidth: 1.5 },
	cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
	slBadge: {
		width: 28,
		height: 28,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surfaceMuted,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: Colors.border,
	},
	slBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.foreground },
	skillTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
	studentSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
	cardDivider: { marginVertical: 2 },

	detailsBlock: { gap: 8 },
	detailRow: { gap: 2 },
	detailRowRight: { gap: 2, alignItems: "flex-end" },
	detailLabel: { fontSize: 11, fontWeight: "600", color: Colors.muted },
	detailValue: { fontSize: 13, color: Colors.foreground, fontWeight: "500" },
	notFilledText: { fontStyle: "italic", color: Colors.muted },
	timesText: { fontSize: 12, fontWeight: "700", color: Colors.foreground },

	// Rejection Reason Banner (Matching Web Screenshot 1)
	rejectionBanner: {
		backgroundColor: "#FFF1F2",
		borderWidth: 1,
		borderColor: "#FECDD3",
		padding: 10,
		borderRadius: Radius.sm,
		gap: 4,
	},
	rejectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
	rejectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.danger },
	rejectionText: { fontSize: 12, color: "#9F1239" },

	cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },

	// Empty Card
	emptyCard: { marginHorizontal: 16, marginVertical: 32, padding: 32, alignItems: "center" },
	emptyStack: { alignItems: "center", gap: 8 },
	emptySub: { fontSize: 12, color: Colors.muted, textAlign: "center", lineHeight: 18 },

	// Modals
	modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	modalContent: {
		backgroundColor: Colors.background,
		borderTopLeftRadius: Radius.lg,
		borderTopRightRadius: Radius.lg,
		padding: 16,
		maxHeight: "85%",
		gap: 16,
	},
	modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 },
	modalSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
	closeBtn: { padding: 4 },
	slNoPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, backgroundColor: Colors.accentSoft },
	slNoPillText: { fontSize: 11, fontWeight: "700", color: Colors.accent },

	modalScroll: { flexGrow: 0 },
	formGap: { gap: 14 },
	fieldGroup: { gap: 4 },
	fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.foreground },
	multilineInput: { minHeight: 70, textAlignVertical: "top" },

	confidenceChipsCol: { gap: 6, marginTop: 4 },
	confidenceChip: {
		padding: 10,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	confidenceChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },

	facultyDropdownBtn: {
		padding: 12,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	facultyDropdownText: { fontSize: 13, color: Colors.foreground },
	facultyDropdownList: {
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.sm,
		marginTop: 4,
	},
	facultyDropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
	facultyItemText: { fontSize: 13, color: Colors.foreground },

	modalFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingTop: 8 },
	modalCancelBtn: { flex: 1 },
	modalSaveBtn: { flex: 1 },
});
