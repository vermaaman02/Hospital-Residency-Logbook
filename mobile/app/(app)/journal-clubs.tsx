/**
 * Journal Clubs screen — Mobile implementation for PG Logbook.
 * Module: "JOURNAL CLUB DISCUSSION / CRITICAL APPRAISAL OF LITERATURE PRESENTED"
 * Target: 10 entries.
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
} from "react-native";
import { useRouter } from "expo-router";
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
	Newspaper,
	BookOpen,
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
	StatusBadge,
	Text,
	VStack,
	ExportButton,
} from "@/components/ui";
import { useJournalClubs, JournalClub, JournalClubInput } from "@/lib/hooks/useJournalClubs";
import { useMe } from "@/lib/hooks/useMe";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { apiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";

type FacultyOption = {
	id: string;
	firstName: string;
	lastName: string;
};

type FormState = {
	date: Date | null;
	journalArticle: string;
	typeOfStudy: string;
	facultyId: string;
};

const INITIAL_FORM: FormState = {
	date: null,
	journalArticle: "",
	typeOfStudy: "",
	facultyId: "",
};

function formatDate(date: string | Date | null): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function JournalClubsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const isFacultyOrHod = me?.role === "faculty" || me?.role === "hod";

	const {
		journalClubs,
		isLoading,
		refetch,
		createJournalClub,
		updateJournalClub,
		submitJournalClub,
		deleteJournalClub,
		signJournalClub,
		rejectJournalClub,
		isCreating,
		isUpdating,
		isSubmitting,
		isSigning,
		isRejecting,
	} = useJournalClubs({ mode: isFacultyOrHod ? "review" : undefined });

	// Fetch faculty list for dropdown
	const { data: facultyList = [] } = useQuery<FacultyOption[]>({
		queryKey: ["journal-club-faculty"],
		queryFn: async () => {
			const { data } = await apiClient.get("/api/v1/journal-clubs?view=faculty");
			return data.data || [];
		},
	});

	// UI State
	const [activeFilter, setActiveFilter] = useState<string>("All");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState<JournalClub | null>(null);
	const [form, setForm] = useState<FormState>(INITIAL_FORM);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showFacultyPicker, setShowFacultyPicker] = useState(false);

	// Reject Modal State
	const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
	const [rejectRemark, setRejectRemark] = useState("");

	// Stats Calculation
	const stats = useMemo(() => {
		const total = journalClubs.length;
		const signed = journalClubs.filter((e) => e.status === "SIGNED").length;
		const submitted = journalClubs.filter((e) => e.status === "SUBMITTED").length;
		const draft = journalClubs.filter((e) => e.status === "DRAFT").length;
		const needsRevision = journalClubs.filter((e) => e.status === "NEEDS_REVISION").length;
		const progressPercent = Math.min(100, Math.round((signed / 10) * 100));
		return { total, signed, submitted, draft, needsRevision, progressPercent };
	}, [journalClubs]);

	// Filtered Entries
	const filteredEntries = useMemo(() => {
		if (activeFilter === "ALL") return journalClubs;
		return journalClubs.filter((e) => e.status === activeFilter);
	}, [journalClubs, activeFilter]);

	// Form actions
	const handleOpenCreate = () => {
		setEditingEntry(null);
		setForm(INITIAL_FORM);
		setIsFormOpen(true);
	};

	const handleOpenEdit = (entry: JournalClub) => {
		setEditingEntry(entry);
		setForm({
			date: entry.date ? new Date(entry.date) : null,
			journalArticle: entry.journalArticle ?? "",
			typeOfStudy: entry.typeOfStudy ?? "",
			facultyId: entry.facultyId ?? "",
		});
		setIsFormOpen(true);
	};

	const handleCloseForm = () => {
		setIsFormOpen(false);
		setEditingEntry(null);
		setForm(INITIAL_FORM);
	};

	const handleSaveForm = async () => {
		if (!form.date) {
			Alert.alert("Required Field", "Please select a date.");
			return;
		}
		if (!form.journalArticle.trim()) {
			Alert.alert("Required Field", "Please enter the journal article reference.");
			return;
		}
		if (!form.typeOfStudy.trim()) {
			Alert.alert("Required Field", "Please enter the type of study.");
			return;
		}
		if (!form.facultyId) {
			Alert.alert("Required Field", "Please select a faculty member to sign.");
			return;
		}

		try {
			const payload: JournalClubInput = {
				date: form.date.toISOString(),
				journalArticle: form.journalArticle.trim(),
				typeOfStudy: form.typeOfStudy.trim(),
				facultyId: form.facultyId,
			};

			if (editingEntry) {
				await updateJournalClub({ id: editingEntry.id, data: payload });
				Alert.alert("Success", "Journal Club entry updated.");
			} else {
				await createJournalClub(payload);
				Alert.alert("Success", "Journal Club entry added.");
			}
			handleCloseForm();
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to save entry");
		}
	};

	const handleSubmitEntry = (id: string) => {
		Alert.alert("Submit for Review", "Are you sure you want to submit this Journal Club entry for faculty approval?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Submit",
				onPress: async () => {
					try {
						await submitJournalClub(id);
						Alert.alert("Submitted", "Entry submitted for faculty review.");
					} catch (e: any) {
						Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to submit entry");
					}
				},
			},
		]);
	};

	const handleDeleteEntry = (id: string) => {
		Alert.alert("Delete Entry", "Are you sure you want to delete this draft entry?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteJournalClub(id);
						Alert.alert("Deleted", "Draft entry deleted.");
					} catch (e: any) {
						Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to delete entry");
					}
				},
			},
		]);
	};

	const handleSignEntry = (id: string) => {
		Alert.alert("Sign Entry", "Approve and sign this Journal Club entry?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign & Approve",
				onPress: async () => {
					try {
						await signJournalClub({ id });
						Alert.alert("Approved", "Journal Club entry signed successfully.");
					} catch (e: any) {
						Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to sign entry");
					}
				},
			},
		]);
	};

	const handleConfirmReject = async () => {
		if (!rejectTargetId) return;
		if (!rejectRemark.trim()) {
			Alert.alert("Remark Required", "Please enter a remark explaining the required revisions.");
			return;
		}
		try {
			await rejectJournalClub({ id: rejectTargetId, remark: rejectRemark.trim() });
			Alert.alert("Revision Requested", "Entry sent back to resident for revision.");
			setRejectTargetId(null);
			setRejectRemark("");
		} catch (e: any) {
			Alert.alert("Error", e?.response?.data?.error || e?.message || "Failed to request revision");
		}
	};

	const selectedFaculty = facultyList.find((f) => f.id === form.facultyId);

	return (
		<Screen bleed>
			<FlatList
				data={filteredEntries}
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
								<Heading level={4}>Journal Clubs</Heading>
								<Text style={styles.topSubtitle}>Literature Appraisal (Target: 10)</Text>
							</VStack>
							<ExportButton module="journal-clubs" label="Export" />
						</HStack>

						{/* Progress & Target Card */}
						<Card style={styles.targetCard}>
							<HStack style={styles.targetHeader}>
								<IconBubble icon={<Newspaper size={20} color="#FFF" />} tone="mint" size={40} />
								<VStack style={styles.flex1}>
									<HStack style={styles.targetRow}>
										<Heading level={4}>Target Progress</Heading>
										<Badge label={`${stats.signed} / 10 Signed`} tone="success" />
									</HStack>
									<Text style={styles.targetSub}>
										Critical appraisal of literature & journal club discussions
									</Text>
								</VStack>
							</HStack>

							{/* Progress Bar */}
							<View style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${stats.progressPercent}%` }]} />
							</View>

							{/* Stat Badges Grid */}
							<HStack style={styles.statsRow}>
								<VStack style={styles.statBox}>
									<Text style={styles.statNum}>{stats.total}</Text>
									<Text style={styles.statLabel}>Total</Text>
								</VStack>
								<View style={styles.statDivider} />
								<VStack style={styles.statBox}>
									<Text style={[styles.statNum, { color: Colors.success }]}>{stats.signed}</Text>
									<Text style={styles.statLabel}>Signed</Text>
								</VStack>
								<View style={styles.statDivider} />
								<VStack style={styles.statBox}>
									<Text style={[styles.statNum, { color: Colors.amber }]}>{stats.submitted}</Text>
									<Text style={styles.statLabel}>Pending</Text>
								</VStack>
								<View style={styles.statDivider} />
								<VStack style={styles.statBox}>
									<Text style={[styles.statNum, { color: Colors.muted }]}>{stats.draft}</Text>
									<Text style={styles.statLabel}>Draft</Text>
								</VStack>
								{stats.needsRevision > 0 && (
									<>
										<View style={styles.statDivider} />
										<VStack style={styles.statBox}>
											<Text style={[styles.statNum, { color: Colors.danger }]}>{stats.needsRevision}</Text>
											<Text style={styles.statLabel}>Revision</Text>
										</VStack>
									</>
								)}
							</HStack>
						</Card>

						{/* Action & Filter Row */}
						<HStack style={styles.actionFilterRow}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
								{[
									{ key: "ALL", label: `All (${stats.total})` },
									{ key: "DRAFT", label: `Draft (${stats.draft})` },
									{ key: "SUBMITTED", label: `Pending (${stats.submitted})` },
									{ key: "SIGNED", label: `Signed (${stats.signed})` },
									...(stats.needsRevision > 0 ? [{ key: "NEEDS_REVISION", label: `Revision (${stats.needsRevision})` }] : []),
								].map((filter) => {
									const active = activeFilter === filter.key;
									return (
										<Pressable
											key={filter.key}
											onPress={() => setActiveFilter(filter.key)}
											style={[styles.filterChip, active && styles.filterChipActive]}
										>
											<Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
												{filter.label}
											</Text>
										</Pressable>
									);
								})}
							</ScrollView>

							{!isFacultyOrHod && (
								<Button
									label="Add Row"
									size="sm"
									leftIcon={<Plus size={16} color="#FFF" />}
									onPress={handleOpenCreate}
								/>
							)}
						</HStack>
					</View>
				}
				renderItem={({ item }) => (
					<JournalClubCard
						item={item}
						facultyList={facultyList}
						isFacultyOrHod={isFacultyOrHod}
						onEdit={() => handleOpenEdit(item)}
						onSubmit={() => handleSubmitEntry(item.id)}
						onDelete={() => handleDeleteEntry(item.id)}
						onSign={() => handleSignEntry(item.id)}
						onReject={() => setRejectTargetId(item.id)}
						isSubmitting={isSubmitting}
						isSigning={isSigning}
						isRejecting={isRejecting}
					/>
				)}
				ListEmptyComponent={
					<Card style={styles.emptyCard}>
						<VStack style={styles.emptyStack}>
							<IconBubble icon={<BookOpen size={24} color="#FFF" />} tone="sky" size={48} />
							<Heading level={4}>
								{activeFilter === "ALL" ? "No Journal Club Entries" : `No ${activeFilter.toLowerCase()} entries`}
							</Heading>
							<Text style={styles.emptySub}>
								{isFacultyOrHod
									? "No journal club submissions are awaiting review."
									: "Tap '+ Add Row' to log your first journal club presentation."}
							</Text>
						</VStack>
					</Card>
				}
				contentContainerStyle={styles.listContent}
			/>

			{/* ======================== CREATE / EDIT MODAL ======================== */}
			<Modal visible={isFormOpen} animationType="slide" transparent onRequestClose={handleCloseForm}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack>
								<Heading level={4}>
									{editingEntry ? `Edit Entry #${editingEntry.slNo}` : "New Journal Club Entry"}
								</Heading>
								<Text style={styles.modalSub}>Fill in literature appraisal details</Text>
							</VStack>
							<Pressable onPress={handleCloseForm} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<ScrollView style={styles.modalFormScroll} keyboardShouldPersistTaps="handled">
							<VStack style={styles.formGap}>
								{/* Date Picker */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Date *</Text>
									<Pressable onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
										<Calendar size={18} color={Colors.accent} />
										<Text style={[styles.dateText, !form.date && styles.placeholderText]}>
											{form.date ? formatDate(form.date) : "Select date"}
										</Text>
									</Pressable>
									{showDatePicker && (
										<DateTimePicker
											value={form.date || new Date()}
											mode="date"
											display="default"
											onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
												setShowDatePicker(false);
												if (selectedDate) setForm((p) => ({ ...p, date: selectedDate }));
											}}
										/>
									)}
								</VStack>

								{/* Journal Article */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Journal Article *</Text>
									<Input
										placeholder="e.g. Title, authors, journal name, volume, year..."
										value={form.journalArticle}
										onChangeText={(text) => setForm((p) => ({ ...p, journalArticle: text }))}
										multiline
										numberOfLines={3}
										style={styles.multilineInput}
									/>
								</VStack>

								{/* Type of Study */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Type of Study *</Text>
									<Input
										placeholder="e.g. Randomized Controlled Trial, Systemic Review, Cohort..."
										value={form.typeOfStudy}
										onChangeText={(text) => setForm((p) => ({ ...p, typeOfStudy: text }))}
									/>
								</VStack>

								{/* Faculty Sign Dropdown */}
								<VStack style={styles.fieldGroup}>
									<Text style={styles.fieldLabel}>Faculty Sign *</Text>
									<Pressable onPress={() => setShowFacultyPicker(true)} style={styles.selectBtn}>
										<HStack style={styles.centerRow}>
											<User size={18} color={Colors.accent} />
											<Text style={[styles.selectText, !form.facultyId && styles.placeholderText]}>
												{selectedFaculty ? `Dr. ${selectedFaculty.firstName} ${selectedFaculty.lastName}` : "Select faculty signee"}
											</Text>
										</HStack>
										<ChevronDown size={18} color={Colors.muted} />
									</Pressable>
								</VStack>
							</VStack>
						</ScrollView>

						{/* Modal Action Footer */}
						<HStack style={styles.modalFooter}>
							<Button label="Cancel" variant="secondary" onPress={handleCloseForm} style={styles.modalCancelBtn} />
							<Button
								label={isCreating || isUpdating ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
								onPress={handleSaveForm}
								disabled={isCreating || isUpdating}
								style={styles.modalSaveBtn}
							/>
						</HStack>
					</View>
				</View>
			</Modal>

			{/* ======================== FACULTY SELECTOR MODAL ======================== */}
			<Modal visible={showFacultyPicker} animationType="fade" transparent onRequestClose={() => setShowFacultyPicker(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, styles.maxHalfHeight]}>
						<HStack style={styles.modalHeader}>
							<Heading level={4}>Select Faculty</Heading>
							<Pressable onPress={() => setShowFacultyPicker(false)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>
						<FlatList
							data={facultyList}
							keyExtractor={(f) => f.id}
							renderItem={({ item: f }) => (
								<Pressable
									onPress={() => {
										setForm((p) => ({ ...p, facultyId: f.id }));
										setShowFacultyPicker(false);
									}}
									style={[styles.facultyPickerItem, form.facultyId === f.id && styles.facultyPickerItemActive]}
								>
									<HStack style={styles.centerRow}>
										<User size={16} color={form.facultyId === f.id ? Colors.accent : Colors.muted} />
										<Text style={[styles.facultyPickerText, form.facultyId === f.id && styles.facultyPickerTextActive]}>
											Dr. {f.firstName} {f.lastName}
										</Text>
									</HStack>
									{form.facultyId === f.id && <Check size={16} color={Colors.accent} />}
								</Pressable>
							)}
						/>
					</View>
				</View>
			</Modal>

			{/* ======================== REJECT REMARK MODAL ======================== */}
			<Modal visible={Boolean(rejectTargetId)} animationType="fade" transparent onRequestClose={() => setRejectTargetId(null)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<HStack style={styles.modalHeader}>
							<VStack>
								<Heading level={4}>Request Revision</Heading>
								<Text style={styles.modalSub}>Provide instructions for the resident</Text>
							</VStack>
							<Pressable onPress={() => setRejectTargetId(null)} style={styles.closeBtn}>
								<X size={20} color={Colors.muted} />
							</Pressable>
						</HStack>

						<VStack style={styles.formGap}>
							<Input
								placeholder="Enter reason for revision..."
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
								label={isRejecting ? "Submitting..." : "Send Back"}
								variant="danger"
								onPress={handleConfirmReject}
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
 * Individual Journal Club Item Card Component
 */
function JournalClubCard({
	item,
	facultyList,
	isFacultyOrHod,
	onEdit,
	onSubmit,
	onDelete,
	onSign,
	onReject,
	isSubmitting,
	isSigning,
	isRejecting,
}: {
	item: JournalClub;
	facultyList: FacultyOption[];
	isFacultyOrHod: boolean;
	onEdit: () => void;
	onSubmit: () => void;
	onDelete: () => void;
	onSign: () => void;
	onReject: () => void;
	isSubmitting: boolean;
	isSigning: boolean;
	isRejecting: boolean;
}) {
	const faculty = facultyList.find((f) => f.id === item.facultyId);
	const facultyName = faculty ? `Dr. ${faculty.firstName} ${faculty.lastName}` : "—";

	const canEdit = item.status === "DRAFT" || item.status === "NEEDS_REVISION";
	const canDelete = item.status === "DRAFT";

	return (
		<Card style={styles.cardItem}>
			{/* Card Header: Sl No + Status */}
			<HStack style={styles.cardHeader}>
				<HStack style={styles.centerRow}>
					<Badge label={`#${item.slNo}`} tone="accent" />
					<Text style={styles.dateBadge}>{formatDate(item.date)}</Text>
				</HStack>
				<StatusBadge status={item.status} />
			</HStack>

			{/* Student Owner Info (when reviewing as Faculty/HOD) */}
			{isFacultyOrHod && item.user && (
				<View style={styles.studentBanner}>
					<Text style={styles.studentBannerText}>
						Resident: Dr. {item.user.firstName} {item.user.lastName} ({item.user.email})
					</Text>
				</View>
			)}

			<Divider style={styles.cardDivider} />

			{/* Card Body Details */}
			<VStack style={styles.cardBody}>
				{/* Journal Article */}
				<VStack style={styles.detailBlock}>
					<Text style={styles.detailLabel}>JOURNAL ARTICLE</Text>
					<Text style={styles.detailValue}>{item.journalArticle || "—"}</Text>
				</VStack>

				{/* Type of Study */}
				<VStack style={styles.detailBlock}>
					<Text style={styles.detailLabel}>TYPE OF STUDY</Text>
					<Text style={styles.detailValue}>{item.typeOfStudy || "—"}</Text>
				</VStack>

				{/* Faculty Signee */}
				<VStack style={styles.detailBlock}>
					<Text style={styles.detailLabel}>FACULTY SIGNEE</Text>
					<HStack style={styles.centerRow}>
						<User size={14} color={Colors.accent} />
						<Text style={styles.detailValueHighlight}>{facultyName}</Text>
					</HStack>
				</VStack>
			</VStack>

			{/* Rejection / Revision Alert Banner */}
			{item.status === "NEEDS_REVISION" && Boolean(item.facultyRemark) && (
				<View style={styles.revisionBanner}>
					<HStack style={styles.revisionHeader}>
						<AlertTriangle size={16} color={Colors.danger} />
						<Text style={styles.revisionTitle}>Faculty Revision Remark:</Text>
					</HStack>
					<Text style={styles.revisionText}>{item.facultyRemark}</Text>
				</View>
			)}

			{/* Faculty Approved Remark */}
			{item.status === "SIGNED" && Boolean(item.facultyRemark) && (
				<View style={styles.signedRemarkBanner}>
					<Text style={styles.signedRemarkLabel}>Remark:</Text>
					<Text style={styles.signedRemarkText}>{item.facultyRemark}</Text>
				</View>
			)}

			{/* Card Footer Actions */}
			<Divider style={styles.cardDivider} />
			<HStack style={styles.cardFooter}>
				{!isFacultyOrHod ? (
					<>
						{/* Resident Actions */}
						{canEdit && (
							<Button
								label="Edit"
								variant="secondary"
								size="sm"
								leftIcon={<FileEdit size={14} color={Colors.foreground} />}
								onPress={onEdit}
							/>
						)}

						{canEdit && (
							<Button
								label={isSubmitting ? "Submitting..." : "Submit"}
								size="sm"
								leftIcon={<Send size={14} color="#FFF" />}
								onPress={onSubmit}
								disabled={isSubmitting}
							/>
						)}

						{canDelete && (
							<Pressable onPress={onDelete} style={styles.deleteIconBtn}>
								<Trash2 size={16} color={Colors.danger} />
							</Pressable>
						)}
					</>
				) : (
					<>
						{/* Faculty Actions */}
						{item.status === "SUBMITTED" && (
							<>
								<Button
									label="Request Revision"
									variant="danger"
									size="sm"
									onPress={onReject}
									disabled={isRejecting}
									style={styles.btnFlex}
								/>
								<Button
									label="Sign & Approve"
									size="sm"
									onPress={onSign}
									disabled={isSigning}
									style={styles.btnFlex}
								/>
							</>
						)}
					</>
				)}
			</HStack>
		</Card>
	);
}

const styles = StyleSheet.create({
	flex1: { flex: 1 },
	centerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	listContent: { paddingBottom: 32 },

	// Header Styles
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

	// Target Card
	targetCard: {
		padding: 16,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: 12,
	},
	targetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
	targetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	targetSub: { fontSize: 12, color: Colors.muted },

	progressTrack: {
		height: 8,
		backgroundColor: Colors.surfaceMuted,
		borderRadius: Radius.pill,
		overflow: "hidden",
		marginVertical: 2,
	},
	progressFill: {
		height: "100%",
		backgroundColor: Colors.mint,
		borderRadius: Radius.pill,
	},

	statsRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		paddingTop: 4,
	},
	statBox: { alignItems: "center" },
	statNum: { fontSize: 15, fontWeight: "700", color: Colors.foreground },
	statLabel: { fontSize: 10, color: Colors.muted, marginTop: 1 },
	statDivider: { width: 1, height: 20, backgroundColor: Colors.border },

	// Action & Filter Row
	actionFilterRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginVertical: 4,
		gap: 8,
	},
	filterScroll: { flexDirection: "row", gap: 6, paddingRight: 8 },
	filterChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	filterChipActive: {
		backgroundColor: Colors.accent,
		borderColor: Colors.accent,
	},
	filterChipText: { fontSize: 12, color: Colors.muted, fontWeight: "500" },
	filterChipTextActive: { color: "#FFF", fontWeight: "700" },

	// Card Item
	cardItem: {
		marginHorizontal: 16,
		marginTop: 12,
		padding: 16,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: 8,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	dateBadge: { fontSize: 12, color: Colors.muted },

	studentBanner: {
		backgroundColor: Colors.surfaceMuted,
		padding: 6,
		borderRadius: Radius.sm,
		marginTop: 4,
	},
	studentBannerText: { fontSize: 11, fontWeight: "600", color: Colors.foreground },

	cardDivider: { marginVertical: 6 },

	cardBody: { gap: 10 },
	detailBlock: { gap: 2 },
	detailLabel: { fontSize: 10, fontWeight: "700", color: Colors.muted, letterSpacing: 0.5 },
	detailValue: { fontSize: 13, color: Colors.foreground, lineHeight: 18 },
	detailValueHighlight: { fontSize: 13, color: Colors.accent, fontWeight: "600" },

	revisionBanner: {
		backgroundColor: "#FFF1F2",
		borderWidth: 1,
		borderColor: "#FECDD3",
		padding: 12,
		borderRadius: Radius.sm,
		gap: 4,
		marginTop: 4,
	},
	revisionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
	revisionTitle: { fontSize: 12, fontWeight: "700", color: Colors.danger },
	revisionText: { fontSize: 12, color: "#9F1239" },

	signedRemarkBanner: {
		backgroundColor: "#F0FDF4",
		borderWidth: 1,
		borderColor: "#BBF7D0",
		padding: 12,
		borderRadius: Radius.sm,
		gap: 2,
		marginTop: 4,
	},
	signedRemarkLabel: { fontSize: 11, fontWeight: "700", color: "#166534" },
	signedRemarkText: { fontSize: 12, color: "#15803D" },

	cardFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 8,
		paddingTop: 2,
	},
	btnFlex: { flex: 1 },
	deleteIconBtn: { padding: 8, borderRadius: Radius.sm, backgroundColor: "#FFF1F2" },

	// Empty Card
	emptyCard: {
		marginHorizontal: 16,
		marginVertical: 32,
		padding: 32,
		alignItems: "center",
	},
	emptyStack: { alignItems: "center", gap: 8 },
	emptySub: { fontSize: 12, color: Colors.muted, textAlign: "center" },

	// Modal Styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: Colors.background,
		borderTopLeftRadius: Radius.lg,
		borderTopRightRadius: Radius.lg,
		padding: 16,
		maxHeight: "85%",
		gap: 16,
	},
	maxHalfHeight: { maxHeight: "50%" },
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 4,
	},
	modalSub: { fontSize: 12, color: Colors.muted },
	closeBtn: { padding: 4 },

	modalFormScroll: { flexGrow: 0 },
	formGap: { gap: 16 },
	fieldGroup: { gap: 4 },
	fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.foreground },

	datePickerBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		height: 44,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.sm,
		paddingHorizontal: 12,
		backgroundColor: Colors.surface,
	},
	dateText: { fontSize: 14, color: Colors.foreground },
	placeholderText: { color: Colors.muted },

	multilineInput: { minHeight: 70, textAlignVertical: "top" },

	selectBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		height: 44,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.sm,
		paddingHorizontal: 12,
		backgroundColor: Colors.surface,
	},
	selectText: { fontSize: 14, color: Colors.foreground },

	modalFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 12,
		paddingTop: 8,
	},
	modalCancelBtn: { flex: 1 },
	modalSaveBtn: { flex: 1 },

	// Faculty Picker Items
	facultyPickerItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	facultyPickerItemActive: { backgroundColor: Colors.surfaceMuted },
	facultyPickerText: { fontSize: 14, color: Colors.foreground },
	facultyPickerTextActive: { fontWeight: "700", color: Colors.accent },
});
