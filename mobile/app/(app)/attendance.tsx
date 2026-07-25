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
	ArrowLeft,
	Calendar as CalendarIcon,
	CalendarCheck,
	CheckCircle2,
	Clock,
	MapPin,
	Minus,
	Send,
	Trash2,
	Undo2,
	User,
	X,
	AlertTriangle,
	TrendingUp,
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
import { useAttendance, AttendanceEntry, FacultyOption } from "@/lib/hooks/useAttendance";
import { Colors, Radius, Spacing } from "@/lib/theme";
import { ROTATION_POSTINGS } from "@/lib/hooks/useRotationPostings";

const ALL_ROTATION_NAMES = ROTATION_POSTINGS.map((r) => r.name);

const STATUS_MAP: Record<string, { label: string; tone: "draft" | "submitted" | "signed" | "needsRevision" }> = {
	DRAFT: { label: "Draft", tone: "draft" },
	SUBMITTED: { label: "Submitted", tone: "submitted" },
	SIGNED: { label: "Signed", tone: "signed" },
	NEEDS_REVISION: { label: "Needs Revision", tone: "needsRevision" },
};

const ATTENDANCE_BADGE_MAP: Record<string, { label: string; bg: string; fg: string }> = {
	Present: { label: "Present", bg: "#ECFDF5", fg: "#065F46" },
	Absent: { label: "Absent", bg: "#FEF2F2", fg: "#B91C1C" },
	Leave: { label: "Leave", bg: "#FFF7ED", fg: "#B45309" },
	Holiday: { label: "Holiday", bg: "#E0F2FE", fg: "#0369A1" },
};

export default function AttendanceScreen() {
	const router = useRouter();
	const {
		entries,
		isLoadingEntries,
		analytics,
		holidays,
		config,
		facultyList,
		isLoadingFaculty,
		markAttendance,
		isMarking,
		updateEntry,
		deleteEntry,
		submitEntry,
		retractEntry,
	} = useAttendance();

	const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");

	// Mark Attendance Form State
	const [markDate, setMarkDate] = useState<Date>(new Date());
	const [showMarkDatePicker, setShowMarkDatePicker] = useState(false);
	const [presentAbsent, setPresentAbsent] = useState<"Present" | "Leave">("Present");
	const [postedDepartment, setPostedDepartment] = useState<string>("Emergency Medicine");
	const [hodName, setHodName] = useState<string>("");
	const [showDeptPicker, setShowDeptPicker] = useState(false);
	const [showFacultyPicker, setShowFacultyPicker] = useState(false);

	// Edit Modal State
	const [editingEntry, setEditingEntry] = useState<AttendanceEntry | null>(null);
	const [editStatus, setEditStatus] = useState<"Present" | "Leave">("Present");
	const [editHodName, setEditHodName] = useState("");
	const [showEditFacultyPicker, setShowEditFacultyPicker] = useState(false);
	const [isSavingEdit, setIsSavingEdit] = useState(false);

	const handleMarkAttendance = async () => {
		try {
			await markAttendance({
				date: markDate.toISOString(),
				presentAbsent,
				postedDepartment,
				hodName: hodName || undefined,
			});
			Alert.alert("Success", `Attendance marked as ${presentAbsent} for ${markDate.toLocaleDateString("en-IN")}`);
		} catch (e: any) {
			const msg = e?.response?.data?.error || e?.message || "Failed to mark attendance";
			Alert.alert("Attendance Error", msg);
		}
	};

	const handleOpenEdit = (entry: AttendanceEntry) => {
		setEditingEntry(entry);
		setEditStatus(entry.presentAbsent === "Leave" ? "Leave" : "Present");
		setEditHodName(entry.hodName || "");
	};

	const handleSaveEdit = async () => {
		if (!editingEntry) return;
		setIsSavingEdit(true);
		try {
			await updateEntry({
				entryId: editingEntry.id,
				presentAbsent: editStatus,
				hodName: editHodName,
			});
			setEditingEntry(null);
		} catch (e: any) {
			const msg = e?.response?.data?.error || e?.message || "Failed to update entry";
			Alert.alert("Error", msg);
		} finally {
			setIsSavingEdit(false);
		}
	};

	const handleSubmit = (entry: AttendanceEntry) => {
		Alert.alert("Submit Entry", "Submit this attendance entry for faculty review?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Submit",
				onPress: async () => {
					try {
						await submitEntry(entry.id);
					} catch (e: any) {
						const msg = e?.response?.data?.error || e?.message || "Failed to submit";
						Alert.alert("Error", msg);
					}
				},
			},
		]);
	};

	const handleRetract = (entry: AttendanceEntry) => {
		Alert.alert("Retract Entry", "Retract this entry back to draft?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Retract",
				onPress: async () => {
					try {
						await retractEntry(entry.id);
					} catch (e: any) {
						const msg = e?.response?.data?.error || e?.message || "Failed to retract";
						Alert.alert("Error", msg);
					}
				},
			},
		]);
	};

	const handleDelete = (entry: AttendanceEntry) => {
		Alert.alert("Delete Entry", "Delete this draft attendance entry?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteEntry(entry.id);
					} catch (e: any) {
						const msg = e?.response?.data?.error || e?.message || "Failed to delete";
						Alert.alert("Error", msg);
					}
				},
			},
		]);
	};

	const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

	const renderEntry = ({ item }: { item: AttendanceEntry }) => {
		const st = STATUS_MAP[item.status] || STATUS_MAP.DRAFT;
		const attBadge = ATTENDANCE_BADGE_MAP[item.presentAbsent || "Present"] || ATTENDANCE_BADGE_MAP.Present;
		const isEditable = item.status === "DRAFT" || item.status === "NEEDS_REVISION";

		return (
			<Card style={styles.entryCard}>
				<VStack gap="2">
					<HStack justify="space-between" align="center">
						<HStack gap="2" align="center">
							<View style={styles.dayBadge}>
								<Text style={styles.dayText}>{item.day ? item.day.substring(0, 3) : "DAY"}</Text>
							</View>
							<Text style={styles.dateText}>{formatDate(item.date)}</Text>
						</HStack>
						<HStack gap="2" align="center">
							<View style={[styles.attChip, { backgroundColor: attBadge.bg }]}>
								<Text style={[styles.attChipText, { color: attBadge.fg }]}>{attBadge.label}</Text>
							</View>
							<Badge label={st.label} tone={st.tone} />
						</HStack>
					</HStack>

					{item.attendanceSheet?.postedDepartment ? (
						<HStack gap="1" align="center">
							<MapPin size={14} color={Colors.muted} />
							<Text variant="muted">Dept: {item.attendanceSheet.postedDepartment}</Text>
						</HStack>
					) : null}

					{item.hodName ? (
						<HStack gap="1" align="center">
							<User size={14} color={Colors.muted} />
							<Text variant="muted">Faculty/HOD: {item.hodName}</Text>
						</HStack>
					) : null}

					{item.facultyRemark && item.status === "NEEDS_REVISION" && (
						<View style={styles.remarkBanner}>
							<Text style={styles.remarkText}>⚠️ {item.facultyRemark}</Text>
						</View>
					)}

					<HStack gap="2" style={{ marginTop: Spacing["2"] }}>
						{isEditable && (
							<>
								<Button label="Edit" onPress={() => handleOpenEdit(item)} size="sm" variant="secondary" style={{ flex: 1 }} />
								<Button label="Submit" onPress={() => handleSubmit(item)} size="sm" style={{ flex: 1 }} />
								{item.status === "DRAFT" && (
									<Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
										<Minus size={16} color="#EF4444" />
									</Pressable>
								)}
							</>
						)}
						{item.status === "SUBMITTED" && (
							<Button label="Retract" onPress={() => handleRetract(item)} size="sm" variant="secondary" style={{ flex: 1 }} />
						)}
					</HStack>
				</VStack>
			</Card>
		);
	};

	if (isLoadingEntries) {
		return (
			<Screen>
				<View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
			</Screen>
		);
	}

	return (
		<Screen bleed>
			<FlatList
				ListHeaderComponent={
					<View style={styles.header}>
						<HStack align="center" gap="3">
							<Pressable onPress={() => router.back()} hitSlop={8}>
								<ArrowLeft size={24} color={Colors.foreground} />
							</Pressable>
							<VStack gap="1" style={{ flex: 1 }}>
								<Heading level={2}>Attendance — Clinical Posting</Heading>
								<Text variant="muted">Daily Attendance Log — MD Emergency Medicine</Text>
							</VStack>
						</HStack>

						{/* 2 Tabs Segmented Control */}
						<View style={styles.tabContainer}>
							<Pressable
								style={[styles.tabButton, activeTab === "mark" && styles.tabButtonActive]}
								onPress={() => setActiveTab("mark")}
							>
								<Text style={[styles.tabText, activeTab === "mark" && styles.tabTextActive]}>Mark & Entries</Text>
							</Pressable>
							<Pressable
								style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
								onPress={() => setActiveTab("history")}
							>
								<Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>Analytics & History</Text>
							</Pressable>
						</View>

						{activeTab === "mark" ? (
							<Card style={styles.markCard}>
								<VStack gap="3">
									<Heading level={3}>Mark Attendance for Today</Heading>

									{/* Date (Read-Only: Today Only) */}
									<Text style={styles.fieldLabel}>Date</Text>
									<View style={[styles.dateButton, styles.dateButtonDisabled]}>
										<CalendarIcon size={16} color={Colors.muted} />
										<Text style={{ color: Colors.muted }}>{new Date().toLocaleDateString("en-IN")}</Text>
									</View>
									<Text variant="muted" style={{ fontSize: 12, marginTop: -2 }}>
										You can only mark today's attendance
									</Text>

									{/* Status Radio Chips */}
									<Text style={styles.fieldLabel}>Attendance Status</Text>
									<HStack gap="2">
										<Pressable
											onPress={() => setPresentAbsent("Present")}
											style={[
												styles.chip,
												presentAbsent === "Present" && styles.chipPresentSelected,
											]}
										>
											<Text style={[styles.chipText, presentAbsent === "Present" && styles.chipPresentTextSelected]}>
												✓ Present
											</Text>
										</Pressable>
										<Pressable
											onPress={() => setPresentAbsent("Leave")}
											style={[
												styles.chip,
												presentAbsent === "Leave" && styles.chipLeaveSelected,
											]}
										>
											<Text style={[styles.chipText, presentAbsent === "Leave" && styles.chipLeaveTextSelected]}>
												✋ Leave
											</Text>
										</Pressable>
									</HStack>

									{/* Posted Department Selector */}
									<Text style={styles.fieldLabel}>Posted Department</Text>
									<Pressable style={styles.dateButton} onPress={() => setShowDeptPicker(true)}>
										<MapPin size={16} color={Colors.muted} />
										<Text>{postedDepartment || "Select Department"}</Text>
									</Pressable>

									{/* HOD / Faculty Selector */}
									<Text style={styles.fieldLabel}>HOD / Faculty In-Charge</Text>
									<Pressable style={styles.dateButton} onPress={() => setShowFacultyPicker(true)}>
										<User size={16} color={Colors.muted} />
										<Text style={{ flex: 1 }}>{hodName || "Select Faculty / HOD"}</Text>
									</Pressable>
									<Input
										placeholder="Or type custom faculty name…"
										value={hodName}
										onChangeText={setHodName}
									/>

									<Button
										label={isMarking ? "Marking..." : "Mark Attendance"}
										onPress={handleMarkAttendance}
										disabled={isMarking}
										style={{ marginTop: Spacing["2"] }}
									/>
								</VStack>
							</Card>
						) : (
							/* Analytics & History View Header */
							<VStack gap="3" style={{ marginTop: Spacing["3"] }}>
								{analytics && (
									<Card style={styles.analyticsCard}>
										<VStack gap="3">
											<HStack justify="space-between" align="center">
												<VStack gap="1">
													<Heading level={3}>Attendance Analytics</Heading>
													<Text variant="muted">Overall Clinical Attendance</Text>
												</VStack>
												<View
													style={[
														styles.pctBadge,
														{ backgroundColor: analytics.meetsMinimum ? "#ECFDF5" : "#FEF2F2" },
													]}
												>
													<Text
														style={[
															styles.pctText,
															{ color: analytics.meetsMinimum ? "#065F46" : "#B91C1C" },
														]}
													>
														{analytics.attendancePct}%
													</Text>
												</View>
											</HStack>

											<View
												style={[
													styles.minNotice,
													{ backgroundColor: analytics.meetsMinimum ? "#F0FDF4" : "#FFFBEB" },
												]}
											>
												<Text
													style={{
														color: analytics.meetsMinimum ? "#166534" : "#92400E",
														fontSize: 13,
														fontWeight: "600",
													}}
												>
													{analytics.meetsMinimum
														? `✓ Meets minimum required (${analytics.minimumPct}%)`
														: `⚠️ Below minimum required (${analytics.minimumPct}%)`}
												</Text>
											</View>

											{/* Grid Stats */}
											<HStack gap="2" style={{ flexWrap: "wrap" }}>
												<View style={styles.statBox}>
													<Text variant="muted" style={styles.statLabel}>Total Days</Text>
													<Text style={styles.statValue}>{analytics.totalDays}</Text>
												</View>
												<View style={styles.statBox}>
													<Text variant="muted" style={styles.statLabel}>Working Days</Text>
													<Text style={styles.statValue}>{analytics.workingDays}</Text>
												</View>
												<View style={[styles.statBox, { backgroundColor: "#ECFDF5" }]}>
													<Text style={[styles.statLabel, { color: "#065F46" }]}>Present</Text>
													<Text style={[styles.statValue, { color: "#065F46" }]}>{analytics.presentDays}</Text>
												</View>
												<View style={[styles.statBox, { backgroundColor: "#FEF2F2" }]}>
													<Text style={[styles.statLabel, { color: "#B91C1C" }]}>Absent</Text>
													<Text style={[styles.statValue, { color: "#B91C1C" }]}>{analytics.absentDays}</Text>
												</View>
												<View style={[styles.statBox, { backgroundColor: "#FFF7ED" }]}>
													<Text style={[styles.statLabel, { color: "#B45309" }]}>Leave</Text>
													<Text style={[styles.statValue, { color: "#B45309" }]}>{analytics.leaveDays}</Text>
												</View>
												<View style={[styles.statBox, { backgroundColor: "#E0F2FE" }]}>
													<Text style={[styles.statLabel, { color: "#0369A1" }]}>Holiday</Text>
													<Text style={[styles.statValue, { color: "#0369A1" }]}>{analytics.holidayDays}</Text>
												</View>
											</HStack>
										</VStack>
									</Card>
								)}

								<HStack justify="space-between" align="center">
									<Heading level={3}>Export Logbook</Heading>
									<ExportButton module="attendance" size="sm" />
								</HStack>

								{holidays.length > 0 && (
									<VStack gap="2">
										<Heading level={3}>Upcoming Holidays</Heading>
										{holidays.map((h) => (
											<Card key={h.id} style={{ padding: Spacing["3"] }}>
												<HStack justify="space-between" align="center">
													<Text style={{ fontWeight: "600", color: Colors.foreground }}>{h.name}</Text>
													<Text variant="muted">{formatDate(h.date)}</Text>
												</HStack>
											</Card>
										))}
									</VStack>
								)}
							</VStack>
						)}

						{activeTab === "mark" && (
							<Heading level={3} style={{ marginTop: Spacing["4"], marginBottom: Spacing["2"] }}>
								Recent Attendance Entries
							</Heading>
						)}
					</View>
				}
				data={activeTab === "mark" ? entries : []}
				keyExtractor={(item) => item.id}
				renderItem={renderEntry}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				ListEmptyComponent={
					activeTab === "mark" ? (
						<Card style={styles.emptyCard}>
							<Text variant="muted" style={{ textAlign: "center" }}>No attendance entries yet. Mark attendance above to get started.</Text>
						</Card>
					) : null
				}
			/>

			{/* Edit Entry Modal */}
			<Modal visible={!!editingEntry} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["4"] }}>
								<Heading level={3}>Edit Attendance Entry</Heading>
								<Pressable onPress={() => setEditingEntry(null)} hitSlop={10}>
									<X size={22} color={Colors.foreground} />
								</Pressable>
							</HStack>

							<Text style={styles.fieldLabel}>Status</Text>
							<HStack gap="2">
								<Pressable
									onPress={() => setEditStatus("Present")}
									style={[styles.chip, editStatus === "Present" && styles.chipPresentSelected]}
								>
									<Text style={[styles.chipText, editStatus === "Present" && styles.chipPresentTextSelected]}>✓ Present</Text>
								</Pressable>
								<Pressable
									onPress={() => setEditStatus("Leave")}
									style={[styles.chip, editStatus === "Leave" && styles.chipLeaveSelected]}
								>
									<Text style={[styles.chipText, editStatus === "Leave" && styles.chipLeaveTextSelected]}>✋ Leave</Text>
								</Pressable>
							</HStack>

							<Text style={styles.fieldLabel}>HOD / Faculty In-Charge</Text>
							<Pressable style={styles.dateButton} onPress={() => setShowEditFacultyPicker(true)}>
								<User size={16} color={Colors.muted} />
								<Text style={{ flex: 1 }}>{editHodName || "Select Faculty / HOD"}</Text>
							</Pressable>
							<Input
								placeholder="Or type custom faculty name…"
								value={editHodName}
								onChangeText={setEditHodName}
								style={{ marginTop: 6 }}
							/>

							<Button
								label={isSavingEdit ? "Saving…" : "Save Changes"}
								onPress={handleSaveEdit}
								disabled={isSavingEdit}
								style={{ marginTop: Spacing["4"] }}
							/>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Department Picker Modal */}
			<Modal visible={showDeptPicker} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: "60%" }]}>
						<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["3"] }}>
							<Heading level={3}>Select Department / Posting</Heading>
							<Pressable onPress={() => setShowDeptPicker(false)} hitSlop={10}>
								<X size={22} color={Colors.foreground} />
							</Pressable>
						</HStack>
						<FlatList
							data={ALL_ROTATION_NAMES}
							keyExtractor={(item) => item}
							renderItem={({ item }) => (
								<Pressable
									style={[styles.deptItem, postedDepartment === item && styles.deptItemSelected]}
									onPress={() => {
										setPostedDepartment(item);
										setShowDeptPicker(false);
									}}
								>
									<Text style={postedDepartment === item ? { color: Colors.accent, fontWeight: "600" } : {}}>{item}</Text>
								</Pressable>
							)}
						/>
					</View>
				</View>
			</Modal>

			{/* Faculty Picker Modal (Mark Form) */}
			<Modal visible={showFacultyPicker} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: "60%" }]}>
						<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["3"] }}>
							<Heading level={3}>Select Faculty / HOD</Heading>
							<Pressable onPress={() => setShowFacultyPicker(false)} hitSlop={10}>
								<X size={22} color={Colors.foreground} />
							</Pressable>
						</HStack>
						{isLoadingFaculty ? (
							<ActivityIndicator size="small" color={Colors.accent} style={{ marginVertical: 20 }} />
						) : facultyList.length === 0 ? (
							<Text variant="muted" style={{ textAlign: "center", marginVertical: 20 }}>No active faculty members found.</Text>
						) : (
							<FlatList
								data={facultyList}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => {
									const name = `Dr. ${item.firstName} ${item.lastName}`;
									return (
										<Pressable
											style={[styles.deptItem, hodName === name && styles.deptItemSelected]}
											onPress={() => {
												setHodName(name);
												setShowFacultyPicker(false);
											}}
										>
											<VStack gap="1">
												<Text style={{ fontWeight: "600", color: Colors.foreground }}>{name}</Text>
												<Text variant="muted" style={{ fontSize: 12 }}>{item.email}</Text>
											</VStack>
										</Pressable>
									);
								}}
							/>
						)}
					</View>
				</View>
			</Modal>

			{/* Faculty Picker Modal (Edit Form) */}
			<Modal visible={showEditFacultyPicker} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: "60%" }]}>
						<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["3"] }}>
							<Heading level={3}>Select Faculty / HOD</Heading>
							<Pressable onPress={() => setShowEditFacultyPicker(false)} hitSlop={10}>
								<X size={22} color={Colors.foreground} />
							</Pressable>
						</HStack>
						{isLoadingFaculty ? (
							<ActivityIndicator size="small" color={Colors.accent} style={{ marginVertical: 20 }} />
						) : facultyList.length === 0 ? (
							<Text variant="muted" style={{ textAlign: "center", marginVertical: 20 }}>No active faculty members found.</Text>
						) : (
							<FlatList
								data={facultyList}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => {
									const name = `Dr. ${item.firstName} ${item.lastName}`;
									return (
										<Pressable
											style={[styles.deptItem, editHodName === name && styles.deptItemSelected]}
											onPress={() => {
												setEditHodName(name);
												setShowEditFacultyPicker(false);
											}}
										>
											<VStack gap="1">
												<Text style={{ fontWeight: "600", color: Colors.foreground }}>{name}</Text>
												<Text variant="muted" style={{ fontSize: 12 }}>{item.email}</Text>
											</VStack>
										</Pressable>
									);
								}}
							/>
						)}
					</View>
				</View>
			</Modal>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: { padding: Spacing["4"], paddingBottom: Spacing["2"] },
	list: { paddingHorizontal: Spacing["4"], paddingBottom: Spacing["12"] },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	tabContainer: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: Radius.md, padding: 3, marginTop: Spacing["3"] },
	tabButton: { flex: 1, paddingVertical: Spacing["2"], alignItems: "center", borderRadius: Radius.sm },
	tabButtonActive: { backgroundColor: "#FFFFFF" },
	tabText: { fontSize: 13, fontWeight: "500", color: Colors.muted },
	tabTextActive: { fontWeight: "700", color: Colors.foreground },
	markCard: { marginTop: Spacing["3"], overflow: "hidden" },
	fieldLabel: { fontSize: 13, fontWeight: "600", color: Colors.muted, marginTop: Spacing["2"], marginBottom: Spacing["1"] },
	dateButton: { flexDirection: "row", alignItems: "center", gap: Spacing["2"], borderWidth: 1, borderColor: "#E2E8F0", borderRadius: Radius.md, padding: Spacing["3"] },
	dateButtonDisabled: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
	chip: { flex: 1, paddingVertical: Spacing["3"], borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: Radius.md, alignItems: "center" },
	chipPresentSelected: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
	chipPresentTextSelected: { color: "#065F46", fontWeight: "700" },
	chipLeaveSelected: { backgroundColor: "#FFF7ED", borderColor: "#F59E0B" },
	chipLeaveTextSelected: { color: "#B45309", fontWeight: "700" },
	chipText: { fontSize: 14, fontWeight: "600", color: Colors.muted },
	entryCard: { overflow: "hidden" },
	dayBadge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
	dayText: { color: "#FFF", fontWeight: "700", fontSize: 11 },
	dateText: { fontSize: 14, fontWeight: "600", color: Colors.foreground },
	attChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
	attChipText: { fontSize: 12, fontWeight: "700" },
	remarkBanner: { backgroundColor: "#FEF3C7", padding: Spacing["2"], borderRadius: Radius.sm },
	remarkText: { color: "#92400E", fontSize: 13 },
	deleteBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#FCA5A5", justifyContent: "center", alignItems: "center" },
	emptyCard: { marginTop: Spacing["4"] },
	analyticsCard: { overflow: "hidden" },
	pctBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
	pctText: { fontSize: 18, fontWeight: "800" },
	minNotice: { padding: Spacing["2"], borderRadius: Radius.sm },
	statBox: { width: "31%", padding: Spacing["2"], borderRadius: Radius.sm, backgroundColor: "#F8FAFC", alignItems: "center" },
	statLabel: { fontSize: 11, fontWeight: "500" },
	statValue: { fontSize: 16, fontWeight: "700", color: Colors.foreground, marginTop: 2 },
	modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing["5"], maxHeight: "85%" },
	deptItem: { padding: Spacing["3"], borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
	deptItemSelected: { backgroundColor: "#EEF2FF" },
});
