/**
 * Rotation Postings screen — mobile implementation of the PG Logbook
 * "LOG OF ROTATION POSTINGS DURING POST GRADUATION IN EM" section.
 *
 * Features:
 * - List of 20 rotations (7 core + 13 elective)
 * - Fill/edit rotation details (dates, duration, faculty)
 * - Submit for review, delete draft entries
 * - View faculty remarks for revisions
 */

import React, { useState, useCallback, useMemo } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import { differenceInDays } from "date-fns";
import {
	ArrowLeft,
	Calendar,
	Check,
	ChevronDown,
	Clock,
	FileEdit,
	GraduationCap,
	RefreshCw,
	Send,
	Trash2,
	User,
	X,
	AlertTriangle,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

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
	SectionHeader,
	StatusBadge,
	Text,
	VStack,
} from "@/components/ui";
import {
	useRotationPostings,
	ROTATION_POSTINGS,
	RotationPosting,
	RotationPostingStatus,
} from "@/lib/hooks/useRotationPostings";
import { Colors, Layout, Radius, Spacing } from "@/lib/theme";

type FormState = {
	startDate: Date | null;
	endDate: Date | null;
	totalDuration: string;
	facultyId: string;
};

function calcDuration(start: Date | null, end: Date | null): string {
	if (!start || !end) return "";
	const days = differenceInDays(end, start);
	if (days < 0) return "Invalid";
	if (days < 7) return `${days} day${days !== 1 ? "s" : ""}`;
	if (days < 30) {
		const weeks = Math.floor(days / 7);
		const rem = days % 7;
		return rem > 0 ? `${weeks}w ${rem}d` : `${weeks} week${weeks !== 1 ? "s" : ""}`;
	}
	const months = Math.floor(days / 30);
	const rem = days % 30;
	return rem > 0 ? `${months}m ${rem}d` : `${months} month${months !== 1 ? "s" : ""}`;
}

function formatDate(date: string | Date | null): string {
	if (!date) return "—";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function RotationPostingsScreen() {
	const router = useRouter();
	const {
		postingsByName,
		facultyList,
		corePostings,
		electivePostings,
		stats,
		isLoading,
		refetch,
		isCreating,
		isUpdating,
		isSubmitting,
		isDeleting,
		createPosting,
		updatePosting,
		submitPosting,
		deletePosting,
	} = useRotationPostings();

	const [editingSlNo, setEditingSlNo] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>({
		startDate: null,
		endDate: null,
		totalDuration: "",
		facultyId: "",
	});
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

	const autoDuration = useMemo(() => calcDuration(form.startDate, form.endDate), [form.startDate, form.endDate]);

	const startEditing = useCallback((slNo: number, posting?: RotationPosting) => {
		if (posting && (posting.status === "SUBMITTED" || posting.status === "SIGNED")) return;
		setEditingSlNo(slNo);
		setForm({
			startDate: posting?.startDate ? new Date(posting.startDate) : null,
			endDate: posting?.endDate ? new Date(posting.endDate) : null,
			totalDuration: posting?.totalDuration ?? "",
			facultyId: posting?.facultyId ?? "",
		});
	}, []);

	const cancelEditing = () => {
		setEditingSlNo(null);
		setShowFacultyDropdown(false);
	};

	const validateForm = (): string[] => {
		const errors: string[] = [];
		if (!form.startDate) errors.push("Start date is required");
		if (!form.endDate) errors.push("End date is required");
		if (!form.totalDuration.trim() && !autoDuration) errors.push("Duration is required");
		if (!form.facultyId) errors.push("Faculty is required");
		return errors;
	};

	const handleSave = async (rotationName: string, existingId?: string) => {
		const errors = validateForm();
		if (errors.length > 0) {
			Alert.alert("Validation Error", errors.join("\n"));
			return;
		}

		const data = {
			rotationName,
			startDate: form.startDate!,
			endDate: form.endDate!,
			totalDuration: form.totalDuration || autoDuration,
			facultyId: form.facultyId,
		};

		try {
			if (existingId) {
				await updatePosting({ ...data, id: existingId });
				Alert.alert("Success", "Rotation posting updated");
			} else {
				await createPosting(data);
				Alert.alert("Success", "Rotation posting created");
			}
			setEditingSlNo(null);
		} catch (e: any) {
			Alert.alert("Error", e?.message || "Failed to save");
		}
	};

	const handleSubmit = (posting: RotationPosting) => {
		const missing: string[] = [];
		if (!posting.startDate) missing.push("Start Date");
		if (!posting.endDate) missing.push("End Date");
		if (!posting.totalDuration) missing.push("Duration");
		if (!posting.facultyId) missing.push("Faculty");
		if (missing.length > 0) {
			Alert.alert("Cannot Submit", `Please fill: ${missing.join(", ")}`);
			return;
		}

		Alert.alert(
			"Submit for Review",
			"This will submit your rotation posting for faculty review. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Submit",
					style: "default",
					onPress: async () => {
						try {
							await submitPosting(posting.id);
							Alert.alert("Success", "Submitted for review");
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to submit");
						}
					},
				},
			],
		);
	};

	const handleDelete = (posting: RotationPosting) => {
		Alert.alert(
			"Delete Draft",
			"Are you sure you want to delete this draft?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await deletePosting(posting.id);
							setEditingSlNo(null);
						} catch (e: any) {
							Alert.alert("Error", e?.message || "Failed to delete");
						}
					},
				},
			],
		);
	};

	const getFacultyName = (id: string | null) => {
		if (!id) return "—";
		const f = facultyList.find((f) => f.id === id);
		return f ? `${f.firstName} ${f.lastName}` : "—";
	};

	const onDateChange = (field: "startDate" | "endDate", event: DateTimePickerEvent, date?: Date) => {
		if (field === "startDate") setShowStartPicker(false);
		else setShowEndPicker(false);
		if (date) {
			setForm((prev) => ({ ...prev, [field]: date }));
		}
	};

	const renderRotationCard = (rotation: typeof ROTATION_POSTINGS[number], isElective: boolean) => {
		const posting = postingsByName.get(rotation.name);
		const isEditing = editingSlNo === rotation.slNo;
		const canEdit = posting
			? posting.status === "DRAFT" || posting.status === "NEEDS_REVISION"
			: true;
		const showRemark = posting?.status === "NEEDS_REVISION" && posting?.facultyRemark;

		if (isEditing) {
			return (
				<Card key={rotation.slNo} variant="featured" style={styles.editCard}>
					<VStack gap="3">
						<HStack gap="2" align="center">
							<IconBubble
								tone="accent"
								size={36}
								icon={<Text variant="bodyStrong" color={Colors.inverse}>{rotation.slNo}</Text>}
							/>
							<VStack gap="0.5" style={styles.flex1}>
								<Text variant="bodyStrong" numberOfLines={2}>{rotation.name}</Text>
								{isElective && <Badge label="Elective" tone="amber" size="sm" />}
							</VStack>
						</HStack>

						<Divider />

						{/* Date Pickers */}
						<HStack gap="3">
							<View style={styles.flex1}>
								<Pressable
									onPress={() => setShowStartPicker(true)}
									style={styles.dateButton}
								>
									<HStack gap="2" align="center">
										<Calendar size={16} color={Colors.muted} />
										<Text variant="body" color={form.startDate ? Colors.foreground : Colors.muted}>
											{form.startDate ? formatDate(form.startDate) : "Start Date"}
										</Text>
									</HStack>
								</Pressable>
							</View>
							<View style={styles.flex1}>
								<Pressable
									onPress={() => setShowEndPicker(true)}
									style={styles.dateButton}
								>
									<HStack gap="2" align="center">
										<Calendar size={16} color={Colors.muted} />
										<Text variant="body" color={form.endDate ? Colors.foreground : Colors.muted}>
											{form.endDate ? formatDate(form.endDate) : "End Date"}
										</Text>
									</HStack>
								</Pressable>
							</View>
						</HStack>

						{showStartPicker && (
							<DateTimePicker
								value={form.startDate || new Date()}
								mode="date"
								onChange={(e, d) => onDateChange("startDate", e, d)}
							/>
						)}
						{showEndPicker && (
							<DateTimePicker
								value={form.endDate || new Date()}
								mode="date"
								onChange={(e, d) => onDateChange("endDate", e, d)}
							/>
						)}

						{/* Duration */}
						<Input
							label="Duration"
							placeholder={autoDuration || "e.g. 4 weeks"}
							value={form.totalDuration}
							onChangeText={(text) => setForm((p) => ({ ...p, totalDuration: text }))}
							hint={autoDuration && !form.totalDuration ? `Auto: ${autoDuration}` : undefined}
						/>

						{/* Faculty Dropdown */}
						<View>
							<Text variant="label" color={Colors.muted}>Faculty</Text>
							<Pressable
								onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
								style={styles.facultyDropdown}
							>
								<HStack justify="space-between" align="center">
									<Text variant="body" color={form.facultyId ? Colors.foreground : Colors.muted}>
										{getFacultyName(form.facultyId) || "Select Faculty"}
									</Text>
									<ChevronDown size={16} color={Colors.muted} />
								</HStack>
							</Pressable>
							{showFacultyDropdown && (
								<Card style={styles.facultyList}>
									<ScrollView style={styles.facultyScroll} nestedScrollEnabled>
										{facultyList.map((f) => (
											<Pressable
												key={f.id}
												onPress={() => {
													setForm((p) => ({ ...p, facultyId: f.id }));
													setShowFacultyDropdown(false);
												}}
												style={styles.facultyItem}
											>
												<Text variant="body">{f.firstName} {f.lastName}</Text>
											</Pressable>
										))}
										</ScrollView>
									</Card>
								)}
							</View>

						{/* Actions */}
						<HStack gap="2" justify="flex-end">
							<Button
								label="Cancel"
								variant="ghost"
								size="sm"
								onPress={cancelEditing}
								leftIcon={<X size={14} color={Colors.muted} />}
							/>
							{posting?.status === "DRAFT" && (
								<Button
									label="Delete"
									variant="ghost"
									size="sm"
									onPress={() => handleDelete(posting)}
									loading={isDeleting}
									leftIcon={<Trash2 size={14} color={Colors.danger} />}
								/>
							)}
							<Button
								label="Save"
								variant="primary"
								size="sm"
								onPress={() => handleSave(rotation.name, posting?.id)}
								loading={isCreating || isUpdating}
								leftIcon={<Check size={14} color={Colors.inverse} />}
							/>
						</HStack>
					</VStack>
				</Card>
			);
		}

		// Read-only card
		return (
			<Pressable
				key={rotation.slNo}
				onPress={() => canEdit && startEditing(rotation.slNo, posting)}
				disabled={!canEdit}
			>
				<Card
					style={[
						styles.readCard,
						!canEdit && styles.disabledCard,
						posting?.status === "SIGNED" && styles.signedCard,
					]}
				>
					<VStack gap="2">
						<HStack gap="3" align="center" justify="space-between">
							<HStack gap="2" align="center" style={styles.flex1}>
								<IconBubble
									tone={isElective ? "amber" : "accent"}
									size={32}
									icon={<Text variant="bodyStrong" color={Colors.inverse}>{rotation.slNo}</Text>}
								/>
								<VStack gap="0.5" style={styles.flex1}>
									<Text variant="bodyStrong" numberOfLines={2}>{rotation.name}</Text>
									{posting ? (
										<StatusBadge status={posting.status} />
									) : (
										<Text variant="bodySm" color={Colors.muted}>Not filled — Tap to add</Text>
									)}
								</VStack>
							</HStack>
						</HStack>

						{posting && (
							<VStack gap="1" style={styles.details}>
								<HStack gap="2" align="center">
									<Calendar size={14} color={Colors.muted} />
									<Text variant="bodySm">
										{formatDate(posting.startDate)} — {formatDate(posting.endDate)}
									</Text>
								</HStack>
								<HStack gap="2" align="center">
									<Clock size={14} color={Colors.muted} />
									<Text variant="bodySm">{posting.totalDuration || "—"}</Text>
								</HStack>
								<HStack gap="2" align="center">
									<User size={14} color={Colors.muted} />
									<Text variant="bodySm">{getFacultyName(posting.facultyId)}</Text>
								</HStack>
							</VStack>
						)}

						{showRemark && (
							<View style={styles.remarkBox}>
								<HStack gap="2" align="flex-start">
									<AlertTriangle size={16} color={Colors.amber} />
									<VStack gap="0.5" style={styles.flex1}>
										<Text variant="bodySm" color={Colors.amber}>Revision Required</Text>
										<Text variant="bodySm">{posting.facultyRemark}</Text>
									</VStack>
								</HStack>
							</View>
						)}

						{posting && canEdit && (
							<HStack gap="2" justify="flex-end" style={styles.actions}>
								{(posting.status === "DRAFT" || posting.status === "NEEDS_REVISION") && (
									<Button
										label="Submit"
										variant="secondary"
										size="sm"
										onPress={() => handleSubmit(posting)}
										loading={isSubmitting}
										leftIcon={<Send size={14} color={Colors.accent} />}
									/>
								)}
							</HStack>
						)}
					</VStack>
				</Card>
			</Pressable>
		);
	};

	const allRotations = [...corePostings, ...electivePostings];

	return (
		<Screen bleed>
			<FlatList
				ListHeaderComponent={
					<View style={styles.header}>
						<HStack gap="3" align="center" style={styles.headerRow}>
							<Pressable onPress={() => router.back()} hitSlop={12}>
								<ArrowLeft size={22} color={Colors.foreground} strokeWidth={2.5} />
							</Pressable>
							<Heading level={2}>Rotation Postings</Heading>
						</HStack>

						<SectionHeader
							title="Log of Rotation Postings"
							subtitle="7 core + 13 elective postings as per NMC guidelines"
						/>

						{/* Stats */}
						<Card variant="featured-violet" style={styles.statsCard}>
							<HStack justify="space-between">
								<VStack gap="0.5" align="center">
									<Text variant="h3">{stats.coreFilled}/7</Text>
									<Text variant="bodySm" color={Colors.muted}>Core</Text>
								</VStack>
								<VStack gap="0.5" align="center">
									<Text variant="h3">{stats.electiveFilled}/13</Text>
									<Text variant="bodySm" color={Colors.muted}>Elective</Text>
								</VStack>
								<VStack gap="0.5" align="center">
									<Text variant="h3" color={Colors.success}>{stats.signed}</Text>
									<Text variant="bodySm" color={Colors.muted}>Signed</Text>
								</VStack>
								<VStack gap="0.5" align="center">
									<Text variant="h3" color={Colors.warning}>{stats.pending}</Text>
									<Text variant="bodySm" color={Colors.muted}>Pending</Text>
								</VStack>
							</HStack>
						</Card>

						<Text variant="bodyStrong" style={styles.sectionTitle}>Core Postings</Text>
					</View>
				}
				data={allRotations}
				keyExtractor={(item) => item.slNo.toString()}
				renderItem={({ item, index }) => {
					// Show elective header after core postings
					if (index === 7) {
						return (
							<>
								<Text variant="bodyStrong" style={[styles.sectionTitle, styles.electiveTitle]}>
									Elective Postings
								</Text>
								{renderRotationCard(item, item.isElective)}
							</>
						);
					}
					return renderRotationCard(item, item.isElective);
				}}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				refreshControl={
					<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.accent} />
				}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: {
		paddingHorizontal: Layout.screenPadding,
		paddingTop: Spacing["4"],
		paddingBottom: Spacing["2"],
	},
	headerRow: {
		paddingVertical: Spacing["3"],
	},
	statsCard: {
		marginTop: Spacing["4"],
		marginBottom: Spacing["4"],
	},
	sectionTitle: {
		marginTop: Spacing["4"],
		marginBottom: Spacing["2"],
	},
	electiveTitle: {
		marginTop: Spacing["6"],
	},
	list: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
	},
	readCard: {
		padding: Spacing["4"],
	},
	disabledCard: {
		opacity: 0.7,
		backgroundColor: Colors.surface,
	},
	signedCard: {
		borderLeftWidth: 4,
		borderLeftColor: Colors.success,
	},
	editCard: {
		padding: Spacing["4"],
		borderWidth: 2,
		borderColor: Colors.accent,
	},
	flex1: {
		flex: 1,
	},
	details: {
		paddingLeft: Spacing["10"],
		marginTop: Spacing["2"],
	},
	actions: {
		marginTop: Spacing["2"],
	},
	remarkBox: {
		backgroundColor: Colors.amber + "20",
		padding: Spacing["3"],
		borderRadius: Radius.md,
		marginTop: Spacing["2"],
	},
	dateButton: {
		borderWidth: 2,
		borderColor: Colors.inputBorder,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.inputBg,
	},
	facultyDropdown: {
		borderWidth: 2,
		borderColor: Colors.inputBorder,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		backgroundColor: Colors.inputBg,
	},
	facultyList: {
		position: "absolute",
		top: 48,
		left: 0,
		right: 0,
		zIndex: 10,
		maxHeight: 200,
		padding: Spacing["2"],
	},
	facultyScroll: {
		maxHeight: 180,
	},
	facultyItem: {
		paddingVertical: Spacing["2"],
		paddingHorizontal: Spacing["3"],
	},
});
