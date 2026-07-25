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
	MapPin,
	Minus,
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
import { useLifeSupportCourses, CourseEntry } from "@/lib/hooks/useLifeSupportCourses";
import { Colors, Radius, Spacing } from "@/lib/theme";

interface ConfidenceLevelOption {
	label: string;
	value: string;
	description: string;
	bgColor: string;
	borderColor: string;
	textColor: string;
}

const CONFIDENCE_LEVELS: ConfidenceLevelOption[] = [
	{ label: "VC", value: "VC", description: "Very Confident", bgColor: "#ECFDF5", borderColor: "#10B981", textColor: "#065F46" },
	{ label: "FC", value: "FC", description: "Fairly Confident", bgColor: "#E8F0FE", borderColor: "#4285F4", textColor: "#1A73E8" },
	{ label: "SC", value: "SC", description: "Slightly Confident", bgColor: "#FFF7ED", borderColor: "#F59E0B", textColor: "#B45309" },
	{ label: "NC", value: "NC", description: "Not Confident", bgColor: "#FEF2F2", borderColor: "#EF4444", textColor: "#B91C1C" },
];

const STATUS_MAP: Record<string, { label: string; tone: "draft" | "submitted" | "signed" | "needsRevision" }> = {
	DRAFT: { label: "Draft", tone: "draft" },
	SUBMITTED: { label: "Submitted", tone: "submitted" },
	SIGNED: { label: "Signed", tone: "signed" },
	NEEDS_REVISION: { label: "Needs Revision", tone: "needsRevision" },
};

export default function LifeSupportCoursesScreen() {
	const router = useRouter();
	const {
		entries,
		isLoadingEntries,
		summary,
		faculty,
		addRow,
		isAddingRow,
		updateEntry,
		submitEntry,
		deleteEntry,
	} = useLifeSupportCourses();

	const [editingEntry, setEditingEntry] = useState<CourseEntry | null>(null);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [formState, setFormState] = useState({
		date: null as Date | null,
		courseName: "",
		conductedAt: "",
		confidenceLevel: "",
		facultyId: null as string | null,
	});
	const [showFacultyPicker, setShowFacultyPicker] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const openEditModal = (entry: CourseEntry) => {
		setEditingEntry(entry);
		setFormState({
			date: entry.date ? new Date(entry.date) : null,
			courseName: entry.courseName || "",
			conductedAt: entry.conductedAt || "",
			confidenceLevel: entry.confidenceLevel || "",
			facultyId: entry.facultyId || null,
		});
	};

	const handleSave = async () => {
		if (!editingEntry) return;
		setIsSaving(true);
		try {
			await updateEntry(editingEntry.id, {
				date: formState.date?.toISOString() || null,
				courseName: formState.courseName || null,
				conductedAt: formState.conductedAt || null,
				confidenceLevel: formState.confidenceLevel || null,
				facultyId: formState.facultyId,
			} as any);
			setEditingEntry(null);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSubmit = (entry: CourseEntry) => {
		if (!entry.courseName) {
			Alert.alert("Validation", "Course Name is required before submitting.");
			return;
		}
		if (!entry.facultyId) {
			Alert.alert("Validation", "Please select a Faculty before submitting.");
			return;
		}
		Alert.alert("Submit Entry", "Submit this entry for faculty review?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Submit",
				onPress: async () => {
					try {
						await submitEntry(entry.id);
					} catch (e: any) {
						Alert.alert("Error", e?.message || "Failed to submit");
					}
				},
			},
		]);
	};

	const handleDelete = (entry: CourseEntry) => {
		Alert.alert("Delete Entry", "Are you sure you want to delete this draft entry?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteEntry(entry.id);
					} catch (e: any) {
						Alert.alert("Error", e?.message || "Failed to delete");
					}
				},
			},
		]);
	};

	const handleAddRow = async () => {
		try {
			await addRow();
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to add row");
		}
	};

	const selectedFaculty = faculty.find((f) => f.id === formState.facultyId);
	const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

	const renderEntry = ({ item }: { item: CourseEntry }) => {
		const st = STATUS_MAP[item.status] || STATUS_MAP.DRAFT;
		const isEditable = item.status === "DRAFT" || item.status === "NEEDS_REVISION";
		const fac = faculty.find((f) => f.id === item.facultyId);

		return (
			<Card style={styles.entryCard}>
				<VStack gap="2">
					<HStack justify="space-between" align="center">
						<HStack gap="2" align="center">
							<View style={[styles.slBadge, { backgroundColor: Colors.accent }]}>
								<Text style={styles.slText}>{item.slNo}</Text>
							</View>
							<Text variant="muted">{formatDate(item.date)}</Text>
						</HStack>
						<Badge label={st.label} tone={st.tone} />
					</HStack>

					{item.courseName ? (
						<Text style={styles.primaryField}>{item.courseName}</Text>
					) : (
						<Text variant="muted" style={{ fontStyle: "italic" }}>No course name</Text>
					)}

					{item.conductedAt ? (
						<HStack gap="1" align="center">
							<MapPin size={14} color={Colors.muted} />
							<Text variant="muted">{item.conductedAt}</Text>
						</HStack>
					) : null}

					{item.confidenceLevel ? (
						<HStack gap="2" align="center">
							<Text variant="muted">Confidence:</Text>
							{(() => {
								const cl = CONFIDENCE_LEVELS.find((c) => c.value === item.confidenceLevel);
								return cl ? (
									<View style={[styles.clChip, { backgroundColor: cl.bgColor, borderColor: cl.borderColor }]}>
										<Text style={[styles.clChipText, { color: cl.textColor }]}>{cl.label} — {cl.description}</Text>
									</View>
								) : (
									<Text variant="muted">{item.confidenceLevel}</Text>
								);
							})()}
						</HStack>
					) : null}

					{fac && (
						<Text variant="muted">Faculty: {fac.firstName} {fac.lastName}</Text>
					)}

					{item.facultyRemark && item.status === "NEEDS_REVISION" && (
						<View style={styles.remarkBanner}>
							<Text style={styles.remarkText}>⚠️ {item.facultyRemark}</Text>
						</View>
					)}

					{isEditable && (
						<HStack gap="2" style={{ marginTop: Spacing["2"] }}>
							<Button label="Edit" onPress={() => openEditModal(item)} size="sm" variant="secondary" style={{ flex: 1 }} />
							<Button label="Submit" onPress={() => handleSubmit(item)} size="sm" style={{ flex: 1 }} />
							{item.status === "DRAFT" && (
								<Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
									<Minus size={16} color="#EF4444" />
								</Pressable>
							)}
						</HStack>
					)}
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
								<Heading level={2}>Life-Support Courses</Heading>
								<Text variant="muted">Skill Development Courses Attended</Text>
							</VStack>
						</HStack>

						{summary && (
							<HStack gap="2" style={styles.summaryRow}>
								<View style={[styles.summaryChip, { backgroundColor: "#E8F0FE" }]}>
									<Text style={{ color: "#1A73E8", fontWeight: "600", fontSize: 12 }}>Total {summary.total}</Text>
								</View>
								<View style={[styles.summaryChip, { backgroundColor: "#ECFDF5" }]}>
									<Text style={{ color: "#065F46", fontWeight: "600", fontSize: 12 }}>Signed {summary.signed}</Text>
								</View>
								<View style={[styles.summaryChip, { backgroundColor: "#FEF2F2" }]}>
									<Text style={{ color: "#B91C1C", fontWeight: "600", fontSize: 12 }}>Revision {summary.needsRevision}</Text>
								</View>
							</HStack>
						)}

						<HStack gap="2" style={{ marginTop: Spacing["3"] }}>
							<Button
								label={isAddingRow ? "Adding…" : "+ Add Row"}
								onPress={handleAddRow}
								disabled={isAddingRow}
								size="sm"
								style={{ flex: 1 }}
							/>
							<ExportButton module="life-support-courses" size="sm" />
						</HStack>
					</View>
				}
				data={entries}
				keyExtractor={(e) => e.id}
				renderItem={renderEntry}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				ListEmptyComponent={
					<Card style={styles.emptyCard}>
						<Text variant="muted" style={{ textAlign: "center" }}>No entries yet. Tap "+ Add Row" to get started.</Text>
					</Card>
				}
			/>

			<Modal visible={!!editingEntry} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["4"] }}>
								<Heading level={3}>Edit Course Entry</Heading>
								<Pressable onPress={() => setEditingEntry(null)} hitSlop={10}>
									<X size={22} color={Colors.foreground} />
								</Pressable>
							</HStack>

							<Text style={styles.fieldLabel}>Date</Text>
							<Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
								<CalendarIcon size={16} color={Colors.muted} />
								<Text>{formState.date ? formState.date.toLocaleDateString("en-IN") : "Select date"}</Text>
							</Pressable>
							{showDatePicker && (
								<DateTimePicker
									value={formState.date || new Date()}
									mode="date"
									onChange={(_, d) => {
										setShowDatePicker(false);
										if (d) setFormState((p) => ({ ...p, date: d }));
									}}
								/>
							)}

							<Text style={styles.fieldLabel}>Course Name *</Text>
							<Input
								placeholder="e.g. BLS, ACLS, ATLS"
								value={formState.courseName}
								onChangeText={(v) => setFormState((p) => ({ ...p, courseName: v }))}
							/>

							<Text style={styles.fieldLabel}>Conducted At</Text>
							<Input
								placeholder="Location / Institution"
								value={formState.conductedAt}
								onChangeText={(v) => setFormState((p) => ({ ...p, conductedAt: v }))}
							/>

							<Text style={styles.fieldLabel}>Confidence Level</Text>
							<View style={styles.chipRow}>
								{CONFIDENCE_LEVELS.map((cl) => {
									const selected = formState.confidenceLevel === cl.value;
									return (
										<Pressable
											key={cl.value}
											onPress={() => setFormState((p) => ({ ...p, confidenceLevel: cl.value }))}
											style={[
												styles.chip,
												{ backgroundColor: selected ? cl.bgColor : "#F8FAFC", borderColor: selected ? cl.borderColor : "#E2E8F0" },
											]}
										>
											<Text style={{ color: selected ? cl.textColor : Colors.muted, fontWeight: selected ? "700" : "500", fontSize: 13 }}>
												{cl.label}
											</Text>
											<Text style={{ color: selected ? cl.textColor : Colors.muted, fontSize: 10 }}>{cl.description}</Text>
										</Pressable>
									);
								})}
							</View>

							<Text style={styles.fieldLabel}>Assigned Faculty</Text>
							<Pressable style={styles.dateButton} onPress={() => setShowFacultyPicker(true)}>
								<Text>{selectedFaculty ? `${selectedFaculty.firstName} ${selectedFaculty.lastName}` : "Select faculty"}</Text>
							</Pressable>

							<Button label={isSaving ? "Saving…" : "Save"} onPress={handleSave} disabled={isSaving} style={{ marginTop: Spacing["4"] }} />
						</ScrollView>
					</View>
				</View>
			</Modal>

			<Modal visible={showFacultyPicker} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: "60%" }]}>
						<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["3"] }}>
							<Heading level={3}>Select Faculty</Heading>
							<Pressable onPress={() => setShowFacultyPicker(false)} hitSlop={10}>
								<X size={22} color={Colors.foreground} />
							</Pressable>
						</HStack>
						<FlatList
							data={faculty}
							keyExtractor={(f) => f.id}
							renderItem={({ item }) => (
								<Pressable
									style={[styles.facultyItem, formState.facultyId === item.id && styles.facultyItemSelected]}
									onPress={() => {
										setFormState((p) => ({ ...p, facultyId: item.id }));
										setShowFacultyPicker(false);
									}}
								>
									<Text style={formState.facultyId === item.id ? { color: Colors.accent, fontWeight: "600" } : {}}>
										{item.firstName} {item.lastName}
									</Text>
								</Pressable>
							)}
							ListEmptyComponent={<Text variant="muted">No faculty available</Text>}
						/>
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
	summaryRow: { marginTop: Spacing["3"], flexWrap: "wrap" },
	summaryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
	entryCard: { overflow: "hidden" },
	slBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
	slText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
	primaryField: { fontSize: 15, fontWeight: "600", color: Colors.foreground },
	clChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1 },
	clChipText: { fontSize: 12, fontWeight: "600" },
	remarkBanner: { backgroundColor: "#FEF3C7", padding: Spacing["2"], borderRadius: Radius.sm },
	remarkText: { color: "#92400E", fontSize: 13 },
	deleteBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#FCA5A5", justifyContent: "center", alignItems: "center" },
	emptyCard: { marginTop: Spacing["4"] },
	modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing["5"], maxHeight: "85%" },
	fieldLabel: { fontSize: 13, fontWeight: "600", color: Colors.muted, marginTop: Spacing["3"], marginBottom: Spacing["1"] },
	dateButton: { flexDirection: "row", alignItems: "center", gap: Spacing["2"], borderWidth: 1, borderColor: "#E2E8F0", borderRadius: Radius.md, padding: Spacing["3"] },
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing["2"] },
	chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5, alignItems: "center", minWidth: 70 },
	facultyItem: { padding: Spacing["3"], borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
	facultyItemSelected: { backgroundColor: "#EEF2FF" },
});
