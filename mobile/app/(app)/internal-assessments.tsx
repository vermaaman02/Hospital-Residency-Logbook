/**
 * Internal Assessments screen — Mobile implementation for PG Logbook.
 * Module: "INTERNAL ASSESSMENTS & EVALUATIONS"
 * Two main tabs:
 * 1. Assessments (View published assessments & submit work)
 * 2. Grades & Evaluations (View evaluated marks, grades & faculty feedback)
 */

import React, { useState, useMemo } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
	Modal,
	Linking,
} from "react-native";
import { useRouter } from "expo-router";
import {
	ArrowLeft,
	Award,
	BarChart3,
	BookOpen,
	Calendar,
	CheckCircle2,
	Clock,
	ExternalLink,
	FileEdit,
	FileText,
	Info,
	Paperclip,
	Plus,
	Search,
	Send,
	User,
	X,
	AlertTriangle,
} from "lucide-react-native";

import {
	Badge,
	Button,
	Card,
	Divider,
	Heading,
	HStack,
	Input,
	Screen,
	StatusBadge,
	Text,
	VStack,
	ExportButton,
} from "@/components/ui";
import {
	useInternalAssessments,
	InternalAssessment,
	SubmissionInfo,
	AssessmentType,
} from "@/lib/hooks/useInternalAssessments";
import { useMe } from "@/lib/hooks/useMe";
import { Colors, Radius, Spacing } from "@/lib/theme";

const TYPE_LABELS: Record<AssessmentType, string> = {
	THEORY: "Theory",
	PRACTICAL: "Practical",
	VIVA: "Viva",
	ASSIGNMENT: "Assignment",
	PROJECT: "Project",
	OTHER: "Other",
};

function formatDate(date: string | Date | null): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function calculateGrade(marks: number, maxMarks: number): string {
	const pct = (marks / maxMarks) * 100;
	if (pct >= 90) return "A+";
	if (pct >= 80) return "A";
	if (pct >= 70) return "B+";
	if (pct >= 60) return "B";
	if (pct >= 50) return "C";
	if (pct >= 40) return "D";
	return "F";
}

export default function InternalAssessmentsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const isFacultyOrHod = me?.role === "faculty" || me?.role === "hod";

	const {
		assessments,
		isLoading,
		refetch,
		submitAssessment,
		saveDraftSubmission,
		evaluateSubmission,
		rejectSubmission,
		isSubmitting,
		isSavingDraft,
		isEvaluating,
		isRejecting,
	} = useInternalAssessments({ mode: isFacultyOrHod ? (me?.role === "hod" ? "hod" : "faculty") : undefined });

	// Active Tab State: "assessments" | "grades"
	const [activeTab, setActiveTab] = useState<"assessments" | "grades">("assessments");

	// Search & Type Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("ALL");

	// Modals State
	const [selectedAssessment, setSelectedAssessment] = useState<InternalAssessment | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isSubmitOpen, setIsSubmitOpen] = useState(false);
	const [submitContent, setSubmitContent] = useState("");
	const [submitAttachmentUrl, setSubmitAttachmentUrl] = useState("");

	// Faculty Evaluation Modal
	const [evalTargetSubmission, setEvalTargetSubmission] = useState<SubmissionInfo | null>(null);
	const [evalMarks, setEvalMarks] = useState("");
	const [evalGrade, setEvalGrade] = useState("");
	const [evalFeedback, setEvalFeedback] = useState("");
	const [evalRejectionReason, setEvalRejectionReason] = useState("");
	const [isRejectMode, setIsRejectMode] = useState(false);

	// Derived Stats Calculation
	const stats = useMemo(() => {
		const total = assessments.length;
		let pending = 0;
		let submitted = 0;
		let evaluated = 0;

		assessments.forEach((a) => {
			const sub = a.submissions[0];
			if (!sub || sub.status === "DRAFT") {
				pending++;
			} else if (sub.status === "SUBMITTED") {
				submitted++;
			} else if (sub.status === "SIGNED") {
				evaluated++;
			} else if (sub.status === "NEEDS_REVISION") {
				pending++;
			}
		});

		return { total, pending, submitted, evaluated };
	}, [assessments]);

	// Filtered Assessments (for Tab 1)
	const filteredAssessments = useMemo(() => {
		return assessments.filter((a) => {
			const matchesSearch =
				!searchQuery.trim() ||
				a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.createdBy.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.createdBy.lastName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType = typeFilter === "ALL" || a.assessmentType === typeFilter;
			return matchesSearch && matchesType;
		});
	}, [assessments, searchQuery, typeFilter]);

	// Evaluated Items (for Tab 2)
	const evaluatedAssessments = useMemo(() => {
		return assessments.filter((a) => {
			const sub = a.submissions[0];
			return sub && sub.evaluation;
		});
	}, [assessments]);

	// Modal Handlers
	const handleOpenSubmit = (assessment: InternalAssessment) => {
		setSelectedAssessment(assessment);
		const existingSub = assessment.submissions[0];
		setSubmitContent(existingSub?.content ?? "");
		setSubmitAttachmentUrl(existingSub?.attachments?.[0] ?? "");
		setIsSubmitOpen(true);
	};

	const handleOpenDetail = (assessment: InternalAssessment) => {
		setSelectedAssessment(assessment);
		setIsDetailOpen(true);
	};

	const handleDoSubmit = async (isDraft: boolean) => {
		if (!selectedAssessment) return;
		try {
			const attachments = submitAttachmentUrl.trim() ? [submitAttachmentUrl.trim()] : [];
			if (isDraft) {
				await saveDraftSubmission({
					assessmentId: selectedAssessment.id,
					content: submitContent,
					attachments,
				});
				Alert.alert("Draft Saved", "Your progress has been saved as draft.");
			} else {
				await submitAssessment({
					assessmentId: selectedAssessment.id,
					content: submitContent,
					attachments,
				});
				Alert.alert("Submitted", "Your assessment work has been submitted for evaluation.");
			}
			setIsSubmitOpen(false);
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to submit assessment");
		}
	};

	const handleDoEvaluate = async () => {
		if (!evalTargetSubmission) return;
		if (isRejectMode) {
			if (!evalRejectionReason.trim()) {
				Alert.alert("Required", "Please provide a reason for requesting revision.");
				return;
			}
			try {
				await rejectSubmission({
					submissionId: evalTargetSubmission.id,
					rejectionReason: evalRejectionReason.trim(),
				});
				Alert.alert("Revision Requested", "Submission sent back to resident for revision.");
				setEvalTargetSubmission(null);
			} catch (e: any) {
				Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to reject submission");
			}
		} else {
			const marksNum = parseFloat(evalMarks);
			if (isNaN(marksNum) || marksNum < 0) {
				Alert.alert("Invalid Marks", "Please enter a valid numeric mark.");
				return;
			}
			try {
				await evaluateSubmission({
					submissionId: evalTargetSubmission.id,
					marks: marksNum,
					grade: evalGrade.trim() || undefined,
					feedback: evalFeedback.trim() || undefined,
				});
				Alert.alert("Evaluated", "Assessment marks & grade saved successfully.");
				setEvalTargetSubmission(null);
			} catch (e: any) {
				Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to save evaluation");
			}
		}
	};

	return (
		<Screen bleed>
			<FlatList
				data={activeTab === "assessments" ? filteredAssessments : evaluatedAssessments}
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
								<Heading level={4}>Internal Assessments</Heading>
								<Text style={styles.topSubtitle}>View assessments, submit work & check grades</Text>
							</VStack>
							<ExportButton module="internal-assessments" label="Export" />
						</HStack>

						{/* 4 Stat Cards Row (Sleek Grid Layout) */}
						<View style={styles.statGrid}>
							<View style={[styles.statTile, styles.statTileBlue]}>
								<HStack style={styles.statTileRow}>
									<View style={[styles.statIconCircle, { backgroundColor: "#DBEAFE" }]}>
										<BookOpen size={18} color="#2563EB" />
									</View>
									<Text style={[styles.statTileNum, { color: "#1E40AF" }]}>{stats.total}</Text>
								</HStack>
								<Text style={styles.statTileLabel} numberOfLines={1}>Total Assessments</Text>
							</View>

							<View style={[styles.statTile, styles.statTileAmber]}>
								<HStack style={styles.statTileRow}>
									<View style={[styles.statIconCircle, { backgroundColor: "#FEF3C7" }]}>
										<Clock size={18} color="#D97706" />
									</View>
									<Text style={[styles.statTileNum, { color: "#92400E" }]}>{stats.pending}</Text>
								</HStack>
								<Text style={styles.statTileLabel} numberOfLines={1}>Pending</Text>
							</View>

							<View style={[styles.statTile, styles.statTilePurple]}>
								<HStack style={styles.statTileRow}>
									<View style={[styles.statIconCircle, { backgroundColor: "#EDE9FE" }]}>
										<Send size={18} color="#7C3AED" />
									</View>
									<Text style={[styles.statTileNum, { color: "#5B21B6" }]}>{stats.submitted}</Text>
								</HStack>
								<Text style={styles.statTileLabel} numberOfLines={1}>Submitted</Text>
							</View>

							<View style={[styles.statTile, styles.statTileGreen]}>
								<HStack style={styles.statTileRow}>
									<View style={[styles.statIconCircle, { backgroundColor: "#D1FAE5" }]}>
										<Award size={18} color="#059669" />
									</View>
									<Text style={[styles.statTileNum, { color: "#065F46" }]}>{stats.evaluated}</Text>
								</HStack>
								<Text style={styles.statTileLabel} numberOfLines={1}>Evaluated</Text>
							</View>
						</View>

						{/* Sub-Navigation Tabs */}
						<View style={styles.tabContainer}>
							<Pressable
								onPress={() => setActiveTab("assessments")}
								style={[styles.tabBtn, activeTab === "assessments" && styles.tabBtnActive]}
							>
								<HStack style={styles.centerRow}>
									<FileText size={16} color={activeTab === "assessments" ? Colors.accent : Colors.muted} />
									<Text style={[styles.tabBtnText, activeTab === "assessments" && styles.tabBtnTextActive]}>
										Assessments
									</Text>
								</HStack>
							</Pressable>

							<Pressable
								onPress={() => setActiveTab("grades")}
								style={[styles.tabBtn, activeTab === "grades" && styles.tabBtnActive]}
							>
								<HStack style={styles.centerRow}>
									<BarChart3 size={16} color={activeTab === "grades" ? Colors.accent : Colors.muted} />
									<Text style={[styles.tabBtnText, activeTab === "grades" && styles.tabBtnTextActive]}>
										Grades & Evaluations
									</Text>
								</HStack>
							</Pressable>
						</View>

						{/* Tab 1 Filters: Search & Type Chips */}
						{activeTab === "assessments" && (
							<VStack style={styles.filterSection}>
								<View style={styles.searchBar}>
									<Search size={18} color={Colors.muted} />
									<Input
										placeholder="Search by title or faculty..."
										value={searchQuery}
										onChangeText={setSearchQuery}
										style={styles.searchInput}
									/>
									{Boolean(searchQuery) && (
										<Pressable onPress={() => setSearchQuery("")}>
											<X size={16} color={Colors.muted} />
										</Pressable>
									)}
								</View>

								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChipsScroll}>
									{[
										{ key: "ALL", label: "All Types" },
										{ key: "THEORY", label: "Theory" },
										{ key: "PRACTICAL", label: "Practical" },
										{ key: "VIVA", label: "Viva" },
										{ key: "ASSIGNMENT", label: "Assignment" },
										{ key: "PROJECT", label: "Project" },
										{ key: "OTHER", label: "Other" },
									].map((chip) => {
										const active = typeFilter === chip.key;
										return (
											<Pressable
												key={chip.key}
												onPress={() => setTypeFilter(chip.key)}
												style={[styles.typeChip, active && styles.typeChipActive]}
											>
												<Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
													{chip.label}
												</Text>
											</Pressable>
										);
									})}
								</ScrollView>
							</VStack>
						)}
					</View>
				}
				renderItem={({ item }) =>
					activeTab === "assessments" ? (
						<AssessmentCard
							item={item}
							isFacultyOrHod={isFacultyOrHod}
							onOpenDetail={() => handleOpenDetail(item)}
							onOpenSubmit={() => handleOpenSubmit(item)}
							onOpenEvaluate={(sub) => {
								setEvalTargetSubmission(sub);
								setEvalMarks(sub.evaluation?.marks?.toString() ?? "");
								setEvalGrade(sub.evaluation?.grade ?? "");
								setEvalFeedback(sub.evaluation?.feedback ?? "");
								setIsRejectMode(false);
							}}
						/>
					) : (
						<GradeCard item={item} />
					)
				}
				ListEmptyComponent={
					<Card style={styles.emptyCard}>
						<VStack style={styles.emptyStack}>
							<Award size={48} color={Colors.accent} />
							<Heading level={4}>
								{activeTab === "assessments"
									? "No Assessments Found"
									: "No Grades or Evaluations Yet"}
							</Heading>
							<Text style={styles.emptySub}>
								{activeTab === "assessments"
									? "No internal assessments match your current filters."
									: "Evaluated assessments with marks and feedback will appear here once signed by faculty."}
							</Text>
						</VStack>
					</Card>
				}
				contentContainerStyle={styles.listContent}
			/>

			{/* ======================== DETAIL MODAL ======================== */}
			<Modal visible={isDetailOpen} animationType="slide" transparent onRequestClose={() => setIsDetailOpen(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack style={styles.flex1}>
								<Heading level={4}>{selectedAssessment?.title}</Heading>
								<Text style={styles.modalSub}>
									{selectedAssessment && TYPE_LABELS[selectedAssessment.assessmentType]} • {selectedAssessment?.batch.name}
								</Text>
							</VStack>
							<Pressable onPress={() => setIsDetailOpen(false)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<ScrollView style={styles.modalFormScroll}>
							<VStack style={styles.formGap}>
								{/* Metadata Grid */}
								<HStack style={styles.metaRow}>
									<VStack style={styles.metaBlock}>
										<Text style={styles.metaLabel}>CREATED BY</Text>
										<Text style={styles.metaValue}>
											Dr. {selectedAssessment?.createdBy.firstName} {selectedAssessment?.createdBy.lastName}
										</Text>
									</VStack>
									<VStack style={styles.metaBlock}>
										<Text style={styles.metaLabel}>DEADLINE</Text>
										<Text style={styles.metaValue}>{formatDate(selectedAssessment?.deadline ?? null)}</Text>
									</VStack>
									<VStack style={styles.metaBlock}>
										<Text style={styles.metaLabel}>MAX MARKS</Text>
										<Text style={styles.metaValue}>{selectedAssessment?.maxMarks ?? 100}</Text>
									</VStack>
								</HStack>

								<Divider style={styles.modalDivider} />

								{/* Description / Instructions */}
								<VStack style={styles.sectionBlock}>
									<Text style={styles.sectionTitle}>INSTRUCTIONS & DESCRIPTION</Text>
									<Text style={styles.descText}>
										{selectedAssessment?.description || "No specific instructions provided."}
									</Text>
								</VStack>

								{/* Attachments & Links */}
								{Boolean(selectedAssessment?.attachments?.length) && (
									<VStack style={styles.sectionBlock}>
										<Text style={styles.sectionTitle}>ATTACHMENTS</Text>
										{selectedAssessment?.attachments.map((link, idx) => (
											<Pressable key={idx} onPress={() => Linking.openURL(link)} style={styles.linkRow}>
												<Paperclip size={14} color={Colors.accent} />
												<Text style={styles.linkText} numberOfLines={1}>
													{link}
												</Text>
												<ExternalLink size={12} color={Colors.muted} />
											</Pressable>
										))}
									</VStack>
								)}
							</VStack>
						</ScrollView>

						<HStack style={styles.modalFooter}>
							<Button label="Close" variant="secondary" onPress={() => setIsDetailOpen(false)} style={styles.modalCancelBtn} />
							{!isFacultyOrHod && selectedAssessment && (
								<Button
									label="Submit Work"
									onPress={() => {
										setIsDetailOpen(false);
										handleOpenSubmit(selectedAssessment);
									}}
									style={styles.modalSaveBtn}
								/>
							)}
						</HStack>
					</View>
				</View>
			</Modal>

			{/* ======================== SUBMISSION WORK MODAL ======================== */}
			<Modal visible={isSubmitOpen} animationType="slide" transparent onRequestClose={() => setIsSubmitOpen(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack style={styles.flex1}>
								<Heading level={4}>Submit Work</Heading>
								<Text style={styles.modalSub}>{selectedAssessment?.title}</Text>
							</VStack>
							<Pressable onPress={() => setIsSubmitOpen(false)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<ScrollView style={styles.modalFormScroll} keyboardShouldPersistTaps="handled">
							<VStack style={styles.formGap}>
								{/* Content Input */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Submission Notes / Content *</Text>
									<Input
										placeholder="Enter your assessment response, notes, or assignment summary..."
										value={submitContent}
										onChangeText={setSubmitContent}
										multiline
										numberOfLines={4}
										style={styles.multilineInput}
									/>
								</VStack>

								{/* Attachment URL */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Attachment Link (PDF / Document URL)</Text>
									<Input
										placeholder="https://drive.google.com/... or document URL"
										value={submitAttachmentUrl}
										onChangeText={setSubmitAttachmentUrl}
									/>
								</VStack>
							</VStack>
						</ScrollView>

						<HStack style={styles.modalFooter}>
							<Button
								label={isSavingDraft ? "Saving..." : "Save Draft"}
								variant="secondary"
								onPress={() => handleDoSubmit(true)}
								disabled={isSavingDraft || isSubmitting}
								style={styles.modalCancelBtn}
							/>
							<Button
								label={isSubmitting ? "Submitting..." : "Submit Work"}
								onPress={() => handleDoSubmit(false)}
								disabled={isSavingDraft || isSubmitting}
								style={styles.modalSaveBtn}
							/>
						</HStack>
					</View>
				</View>
			</Modal>

			{/* ======================== FACULTY EVALUATE / REJECT MODAL ======================== */}
			<Modal visible={Boolean(evalTargetSubmission)} animationType="fade" transparent onRequestClose={() => setEvalTargetSubmission(null)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack style={styles.flex1}>
								<Heading level={4}>{isRejectMode ? "Request Revision" : "Evaluate Submission"}</Heading>
								<Text style={styles.modalSub}>
									Resident: Dr. {evalTargetSubmission?.student?.firstName} {evalTargetSubmission?.student?.lastName}
								</Text>
							</VStack>
							<Pressable onPress={() => setEvalTargetSubmission(null)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<VStack style={styles.formGap}>
							{!isRejectMode ? (
								<>
									<HStack style={styles.formRow}>
										<VStack style={[styles.fieldGroup, styles.flex1]}>
											<Text style={styles.fieldLabel}>Marks Obtained *</Text>
											<Input
												placeholder="e.g. 85"
												value={evalMarks}
												onChangeText={(text) => {
													setEvalMarks(text);
													const n = parseFloat(text);
													if (!isNaN(n)) {
														setEvalGrade(calculateGrade(n, selectedAssessment?.maxMarks || 100));
													}
												}}
												keyboardType="numeric"
											/>
										</VStack>

										<VStack style={[styles.fieldGroup, styles.flex1]}>
											<Text style={styles.fieldLabel}>Grade</Text>
											<Input placeholder="e.g. A+" value={evalGrade} onChangeText={setEvalGrade} />
										</VStack>
									</HStack>

									<VStack style={styles.fieldGroup}>
										<Text style={styles.fieldLabel}>Faculty Feedback</Text>
										<Input
											placeholder="Enter comments, strengths, or recommendations..."
											value={evalFeedback}
											onChangeText={setEvalFeedback}
											multiline
											numberOfLines={3}
											style={styles.multilineInput}
										/>
									</VStack>
								</>
							) : (
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Reason for Revision *</Text>
									<Input
										placeholder="Specify why this submission requires revision..."
										value={evalRejectionReason}
										onChangeText={setEvalRejectionReason}
										multiline
										numberOfLines={3}
										style={styles.multilineInput}
									/>
								</VStack>
							)}
						</VStack>

						<HStack style={styles.modalFooter}>
							<Button
								label={isRejectMode ? "Switch to Evaluate" : "Request Revision"}
								variant="secondary"
								onPress={() => setIsRejectMode(!isRejectMode)}
								style={styles.modalCancelBtn}
							/>
							<Button
								label={isEvaluating || isRejecting ? "Saving..." : isRejectMode ? "Send Back" : "Save & Lock"}
								variant={isRejectMode ? "danger" : "primary"}
								onPress={handleDoEvaluate}
								disabled={isEvaluating || isRejecting}
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
 * Tab 1 Assessment Item Card Component
 */
function AssessmentCard({
	item,
	isFacultyOrHod,
	onOpenDetail,
	onOpenSubmit,
	onOpenEvaluate,
}: {
	item: InternalAssessment;
	isFacultyOrHod: boolean;
	onOpenDetail: () => void;
	onOpenSubmit: () => void;
	onOpenEvaluate: (sub: SubmissionInfo) => void;
}) {
	const submission = item.submissions[0];
	const status = submission ? submission.status : "PENDING";
	const isEvaluated = status === "SIGNED";

	return (
		<Card style={styles.cardItem}>
			{/* Card Header: Title + Type Badge + Status */}
			<HStack style={styles.cardHeader}>
				<VStack style={styles.flex1}>
					<HStack style={styles.centerRow}>
						<Heading level={4} style={styles.cardTitle}>
							{item.title}
						</Heading>
						<Badge label={TYPE_LABELS[item.assessmentType]} tone="info" />
					</HStack>
					<Text style={styles.cardAuthor}>
						By Dr. {item.createdBy.firstName} {item.createdBy.lastName} • {item.batch.name}
					</Text>
				</VStack>
				<StatusBadge status={status as any} />
			</HStack>

			<Divider style={styles.cardDivider} />

			{/* Meta Row: Deadline & Max Marks */}
			<HStack style={styles.cardMetaRow}>
				<HStack style={styles.centerRow}>
					<Calendar size={14} color={Colors.muted} />
					<Text style={styles.cardMetaText}>Deadline: {formatDate(item.deadline)}</Text>
				</HStack>

				<HStack style={styles.centerRow}>
					<Award size={14} color={Colors.accent} />
					<Text style={styles.cardMetaTextBold}>Max Marks: {item.maxMarks ?? 100}</Text>
				</HStack>
			</HStack>

			{/* Rejection / Revision Banner */}
			{status === "NEEDS_REVISION" && submission?.evaluation?.rejectionReason && (
				<View style={styles.revisionBanner}>
					<HStack style={styles.revisionHeader}>
						<AlertTriangle size={14} color={Colors.danger} />
						<Text style={styles.revisionTitle}>Revision Reason:</Text>
					</HStack>
					<Text style={styles.revisionText}>{submission.evaluation.rejectionReason}</Text>
				</View>
			)}

			<Divider style={styles.cardDivider} />

			{/* Actions Footer */}
			<HStack style={styles.cardFooter}>
				<Button
					label="Details"
					variant="secondary"
					size="sm"
					leftIcon={<Info size={14} color={Colors.foreground} />}
					onPress={onOpenDetail}
				/>

				{!isFacultyOrHod ? (
					!isEvaluated && (
						<Button
							label={submission?.status === "SUBMITTED" ? "Edit Submission" : "Submit Work"}
							size="sm"
							leftIcon={<Send size={14} color="#FFF" />}
							onPress={onOpenSubmit}
						/>
					)
				) : (
					submission &&
					submission.status === "SUBMITTED" && (
						<Button
							label="Evaluate Work"
							size="sm"
							leftIcon={<FileEdit size={14} color="#FFF" />}
							onPress={() => onOpenEvaluate(submission)}
						/>
					)
				)}
			</HStack>
		</Card>
	);
}

/**
 * Tab 2 Evaluated Assessment Grade Card Component (Matching Screenshot 2)
 */
function GradeCard({ item }: { item: InternalAssessment }) {
	const submission = item.submissions[0];
	const evaluation = submission?.evaluation;
	if (!evaluation) return null;

	const marksObtained = evaluation.marks ?? 0;
	const maxMarks = item.maxMarks ?? 100;
	const percentage = ((marksObtained / maxMarks) * 100).toFixed(1);
	const gradeStr = evaluation.grade || calculateGrade(marksObtained, maxMarks);
	const evaluator = evaluation.evaluatedBy
		? `Dr. ${evaluation.evaluatedBy.firstName} ${evaluation.evaluatedBy.lastName}`
		: "Faculty";

	return (
		<Card style={[styles.cardItem, styles.gradeCardContainer]}>
			{/* Header: Title + Type + Signed */}
			<HStack style={styles.cardHeader}>
				<VStack style={styles.flex1}>
					<HStack style={styles.centerRow}>
						<Heading level={4} style={styles.cardTitle}>{item.title}</Heading>
						<Badge label={TYPE_LABELS[item.assessmentType]} tone="info" />
						<Badge label="Signed" tone="signed" />
					</HStack>
					<Text style={styles.cardAuthor}>
						{item.batch.name} • {formatDate(evaluation.evaluatedAt)}
					</Text>
				</VStack>
			</HStack>

			{/* Big Marks / Grade / Percentage Banner */}
			<HStack style={styles.gradeBanner}>
				<VStack style={styles.gradeStatBox}>
					<HStack style={styles.centerRow}>
						<Heading level={2} style={styles.gradeNumPrimary}>{marksObtained}</Heading>
						<Text style={styles.gradeNumSub}>/ {maxMarks}</Text>
					</HStack>
					<Text style={styles.gradeStatLabel}>Marks</Text>
				</VStack>

				<View style={styles.gradeDivider} />

				<VStack style={styles.gradeStatBox}>
					<Heading level={2} style={styles.gradeNumAccent}>{gradeStr}</Heading>
					<Text style={styles.gradeStatLabel}>Grade</Text>
				</VStack>

				<View style={styles.gradeDivider} />

				<VStack style={styles.gradeStatBox}>
					<Heading level={2} style={styles.gradeNumAmber}>{percentage}%</Heading>
					<Text style={styles.gradeStatLabel}>Percentage</Text>
				</VStack>
			</HStack>

			{/* Faculty Feedback Container */}
			{Boolean(evaluation.feedback) && (
				<View style={styles.feedbackContainer}>
					<HStack style={styles.feedbackHeader}>
						<CheckCircle2 size={16} color="#3B82F6" />
						<Text style={styles.feedbackTitle}>Faculty Feedback</Text>
					</HStack>
					<Text style={styles.feedbackText}>{evaluation.feedback}</Text>
				</View>
			)}

			<Text style={styles.evaluatorFooter}>
				Evaluated on {formatDate(evaluation.evaluatedAt)} by {evaluator}
			</Text>
		</Card>
	);
}

const styles = StyleSheet.create({
	flex1: { flex: 1 },
	centerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	listContent: { paddingBottom: 32 },

	// Header
	headerContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 12,
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 4,
	},
	iconBtn: {
		padding: 8,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surface,
	},
	topSubtitle: { fontSize: 12, color: Colors.muted },

	// Stat Grid Layout (Sleek 2x2 Grid using clean View cards)
	statGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		gap: 10,
		marginVertical: 4,
	},
	statTile: {
		width: "48%",
		padding: 12,
		borderRadius: Radius.md,
		borderWidth: 1.5,
		gap: 6,
	},
	statTileBlue: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
	statTileAmber: { borderColor: "#FDE68A", backgroundColor: "#FEF3C7" },
	statTilePurple: { borderColor: "#DDD6FE", backgroundColor: "#F3E8FF" },
	statTileGreen: { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },

	statTileRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	statIconCircle: {
		width: 32,
		height: 32,
		borderRadius: Radius.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	statTileNum: { fontSize: 22, fontWeight: "800" },
	statTileLabel: { fontSize: 11, fontWeight: "600", color: Colors.muted },

	// Sub-Navigation Tabs
	tabContainer: {
		flexDirection: "row",
		backgroundColor: Colors.surfaceMuted,
		padding: 4,
		borderRadius: Radius.pill,
		marginVertical: 4,
	},
	tabBtn: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.pill,
	},
	tabBtnActive: {
		backgroundColor: Colors.surface,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	tabBtnText: { fontSize: 13, fontWeight: "600", color: Colors.muted },
	tabBtnTextActive: { color: Colors.accent, fontWeight: "700" },

	// Filters & Search Bar
	filterSection: { gap: 10, marginTop: 4, marginBottom: 4 },
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surface,
		borderWidth: 1.5,
		borderColor: Colors.border,
		borderRadius: Radius.pill,
		paddingHorizontal: 14,
		height: 44,
		gap: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		height: 44,
		borderWidth: 0,
		paddingHorizontal: 0,
		backgroundColor: "transparent",
	},
	typeChipsScroll: { flexDirection: "row", gap: 6, paddingRight: 8 },
	typeChip: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
	typeChipText: { fontSize: 12, color: Colors.muted, fontWeight: "500" },
	typeChipTextActive: { color: "#FFF", fontWeight: "700" },

	// Assessment Card
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
	cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
	cardTitle: { fontSize: 15, fontWeight: "700" },
	cardAuthor: { fontSize: 12, color: Colors.muted, marginTop: 2 },
	cardDivider: { marginVertical: 4 },
	cardMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	cardMetaText: { fontSize: 12, color: Colors.muted },
	cardMetaTextBold: { fontSize: 12, fontWeight: "700", color: Colors.accent },

	revisionBanner: {
		backgroundColor: "#FFF1F2",
		borderWidth: 1,
		borderColor: "#FECDD3",
		padding: 10,
		borderRadius: Radius.sm,
		gap: 4,
	},
	revisionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
	revisionTitle: { fontSize: 12, fontWeight: "700", color: Colors.danger },
	revisionText: { fontSize: 12, color: "#9F1239" },

	cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },

	// Grade Card Specifics (Screenshot 2)
	gradeCardContainer: { borderColor: "#A7F3D0", borderWidth: 1.5 },
	gradeBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		backgroundColor: Colors.surfaceMuted,
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderRadius: Radius.md,
		marginVertical: 4,
	},
	gradeStatBox: { alignItems: "center" },
	gradeNumPrimary: { fontSize: 24, fontWeight: "800", color: "#2563EB" },
	gradeNumSub: { fontSize: 13, color: Colors.muted, fontWeight: "600" },
	gradeNumAccent: { fontSize: 24, fontWeight: "800", color: "#059669" },
	gradeNumAmber: { fontSize: 24, fontWeight: "800", color: "#D97706" },
	gradeStatLabel: { fontSize: 11, color: Colors.muted, fontWeight: "600", marginTop: 2 },
	gradeDivider: { width: 1, height: 32, backgroundColor: Colors.border },

	feedbackContainer: {
		backgroundColor: "#EFF6FF",
		borderWidth: 1,
		borderColor: "#BFDBFE",
		padding: 12,
		borderRadius: Radius.sm,
		gap: 6,
		marginVertical: 2,
	},
	feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
	feedbackTitle: { fontSize: 13, fontWeight: "700", color: "#1E40AF" },
	feedbackText: { fontSize: 13, color: "#1E3A8A", lineHeight: 18 },
	evaluatorFooter: { fontSize: 11, color: Colors.muted, fontStyle: "italic", marginTop: 2 },

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
	modalSub: { fontSize: 12, color: Colors.muted },
	closeBtn: { padding: 4 },
	modalFormScroll: { flexGrow: 0 },
	formGap: { gap: 16 },
	formRow: { gap: 8 },
	fieldGroup: { gap: 4 },
	fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.foreground },
	multilineInput: { minHeight: 80, textAlignVertical: "top" },
	modalFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingTop: 8 },
	modalCancelBtn: { flex: 1 },
	modalSaveBtn: { flex: 1 },
	modalDivider: { marginVertical: 4 },

	// Detail Modal Blocks
	metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
	metaBlock: { gap: 2 },
	metaLabel: { fontSize: 10, fontWeight: "700", color: Colors.muted },
	metaValue: { fontSize: 13, fontWeight: "600", color: Colors.foreground },
	sectionBlock: { gap: 6 },
	sectionTitle: { fontSize: 11, fontWeight: "700", color: Colors.muted, letterSpacing: 0.5 },
	descText: { fontSize: 13, color: Colors.foreground, lineHeight: 18 },
	linkRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: 10,
		borderRadius: Radius.sm,
	},
	linkText: { flex: 1, fontSize: 12, color: Colors.accent },
});
