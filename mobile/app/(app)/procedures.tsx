import React, { useState, useCallback } from "react";
import {
	ActivityIndicator,
	Alert,
	BackHandler,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
	ArrowLeft,
	Calendar,
	CheckCircle2,
	ChevronRight,
	FileText,
	Hash,
	Lock,
	MapPin,
	Plus,
	Search,
	User,
	UserCheck,
	X,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HStack, VStack } from "@/components/ui/Stack";
import { ExportButton } from "@/components/ui/ExportButton";
import { Colors, Radius, Spacing } from "@/lib/theme";
import {
	useProcedureLogs,
	ProcedureLogEntry,
} from "@/lib/hooks/useProcedureLogs";
import { useMe } from "@/lib/hooks/useMe";
import {
	PROCEDURE_CATEGORIES,
	PROCEDURE_CATEGORY_LABELS,
	ProcedureCategoryConfig,
	isCprCategory,
} from "@/lib/constants/procedure-categories";

const STANDARD_SKILL_LEVELS = [
	{ code: "S", label: "Simulation", color: "#8E44AD" },
	{ code: "O", label: "Observed", color: "#16A085" },
	{ code: "A", label: "Assisted", color: "#2980B9" },
	{ code: "PS", label: "Supervised", color: "#D35400" },
	{ code: "PI", label: "Independent", color: "#27AE60" },
] as const;

const CPR_SKILL_LEVELS = [
	{ code: "S", label: "Simulation", color: "#8E44AD" },
	{ code: "TM", label: "Team Member", color: "#2980B9" },
	{ code: "TL", label: "Team Leader", color: "#27AE60" },
] as const;

export default function ProcedureLogsScreen() {
	const router = useRouter();
	const { data: me } = useMe();
	const isFaculty = me?.role?.toLowerCase() === "faculty" || me?.role?.toLowerCase() === "hod";

	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Modals & Date Picker
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editingEntry, setEditingEntry] = useState<Partial<ProcedureLogEntry> | null>(null);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [revisionModalVisible, setRevisionModalVisible] = useState(false);
	const [revisionEntryId, setRevisionEntryId] = useState<string | null>(null);
	const [facultyRemarkInput, setFacultyRemarkInput] = useState("");

	const activeCategoryConfig = PROCEDURE_CATEGORIES.find(
		(c: ProcedureCategoryConfig) => c.enumValue === selectedCategory,
	);
	const isCpr = selectedCategory ? isCprCategory(selectedCategory) : false;
	const skillOptions = isCpr ? CPR_SKILL_LEVELS : STANDARD_SKILL_LEVELS;

	const {
		entries,
		summary,
		facultyList,
		signedCount,
		totalCount,
		isLoading,
		refetch,
		addRow,
		isAddingRow,
		updateEntry,
		isUpdating,
		submitEntry,
		isSubmitting,
		signEntry,
		isSigning,
		rejectEntry,
		isRejecting,
	} = useProcedureLogs({
		category: selectedCategory || undefined,
		mode: isFaculty ? "review" : "student",
	});

	// Filtered 49 Categories list
	const filteredCategories = PROCEDURE_CATEGORIES.filter((cat: ProcedureCategoryConfig) => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return true;
		return cat.label.toLowerCase().includes(q) || cat.enumValue.toLowerCase().includes(q);
	});

	// Handle Back Navigation (Top Bar & Android Hardware Back)
	const handleBackPress = useCallback(() => {
		if (selectedCategory) {
			setSelectedCategory(null);
			return true;
		}
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(app)/logbook");
		}
		return true;
	}, [selectedCategory, router]);

	useFocusEffect(
		useCallback(() => {
			const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
			return () => subscription.remove();
		}, [handleBackPress])
	);

	// Handle Edit Open
	const handleOpenEdit = (entry: ProcedureLogEntry) => {
		setEditingEntry({
			id: entry.id,
			procedureCategory: entry.procedureCategory,
			slNo: entry.slNo,
			date: entry.date ? new Date(entry.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
			patientName: entry.patientName || "",
			patientAge: entry.patientAge ?? undefined,
			patientSex: entry.patientSex || "M",
			uhid: entry.uhid || "",
			completeDiagnosis: entry.completeDiagnosis || "",
			procedureDescription: entry.procedureDescription || "",
			performedAtLocation: entry.performedAtLocation || "",
			skillLevel: entry.skillLevel || (isCpr ? "S" : "PI"),
			facultyId: entry.facultyId || (facultyList[0]?.id ?? ""),
		});
		setEditModalVisible(true);
	};

	// Handle Save Edit
	const handleSaveEdit = async () => {
		if (!editingEntry?.id) return;
		try {
			await updateEntry({
				id: editingEntry.id,
				data: {
					date: editingEntry.date,
					patientName: editingEntry.patientName,
					patientAge: editingEntry.patientAge ? Number(editingEntry.patientAge) : null,
					patientSex: editingEntry.patientSex,
					uhid: editingEntry.uhid,
					completeDiagnosis: editingEntry.completeDiagnosis,
					procedureDescription: editingEntry.procedureDescription,
					performedAtLocation: editingEntry.performedAtLocation,
					skillLevel: editingEntry.skillLevel,
					facultyId: editingEntry.facultyId,
				},
			});
			setEditModalVisible(false);
			setEditingEntry(null);
			Alert.alert("Success", "Procedure log entry updated successfully");
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
			Alert.alert("Update Failed", msg || "Failed to update procedure log");
		}
	};

	// Handle Submit
	const handleSubmit = async (id: string) => {
		try {
			await submitEntry(id);
			Alert.alert("Submitted", "Procedure log entry submitted for faculty sign-off.");
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
			Alert.alert("Submission Error", msg || "Could not submit entry");
		}
	};

	// Handle Faculty Sign
	const handleSign = async (id: string) => {
		try {
			await signEntry({ id, remark: "Signed via mobile app" });
			Alert.alert("Signed Off", "Procedure log approved.");
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
			Alert.alert("Signing Error", msg || "Failed to sign entry");
		}
	};

	// Handle Faculty Reject
	const handleConfirmReject = async () => {
		if (!revisionEntryId || !facultyRemarkInput.trim()) {
			Alert.alert("Validation", "Please enter a remark explaining what needs revision.");
			return;
		}
		try {
			await rejectEntry({ id: revisionEntryId, remark: facultyRemarkInput.trim() });
			setRevisionModalVisible(false);
			setRevisionEntryId(null);
			setFacultyRemarkInput("");
			Alert.alert("Revision Requested", "Student notified to revise entry.");
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
			Alert.alert("Error", msg || "Failed to send revision request");
		}
	};

	// Handle Add Row
	const handleAddRow = async () => {
		if (!selectedCategory) return;
		try {
			await addRow(selectedCategory);
		} catch (err: any) {
			const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
			Alert.alert("Capacity Reached", msg || "Maximum entry capacity reached for this procedure category.");
		}
	};

	// Render Skill Level Badge
	const renderSkillLevelBadge = (level: string | null) => {
		if (!level) return <Text variant="bodySm" style={{ color: Colors.muted }}>—</Text>;
		const allOptions = [...STANDARD_SKILL_LEVELS, ...CPR_SKILL_LEVELS];
		const config = allOptions.find((c) => c.code === level);
		return (
			<View style={[styles.skillBadge, { backgroundColor: (config?.color || Colors.accent) + "15", borderColor: config?.color || Colors.accent }]}>
				<Text style={[styles.skillBadgeText, { color: config?.color || Colors.accent }]}>{level}</Text>
			</View>
		);
	};

	// Render Status Badge
	const renderStatusBadge = (status: string) => {
		switch (status) {
			case "SIGNED":
				return <Badge label="SIGNED" tone="signed" />;
			case "SUBMITTED":
				return <Badge label="SUBMITTED" tone="submitted" />;
			case "NEEDS_REVISION":
				return <Badge label="NEEDS REVISION" tone="needsRevision" />;
			default:
				return <Badge label="DRAFT" tone="draft" />;
		}
	};

	return (
		<View style={styles.container}>
			{/* Top Bar Navigation Header */}
			<View style={styles.headerBar}>
				<HStack justify="space-between" align="center">
					<HStack gap="2" align="center">
						<Pressable onPress={handleBackPress} style={styles.backBtn}>
							<ArrowLeft size={20} color={Colors.foreground} />
						</Pressable>
						<VStack gap="0">
							<Heading level={3}>
								{selectedCategory
									? PROCEDURE_CATEGORY_LABELS[selectedCategory] || selectedCategory
									: "Procedure Logs"}
							</Heading>
							<Text variant="bodySm" color={Colors.muted}>
								{selectedCategory
									? `${activeCategoryConfig?.maxEntries || 0} max slots — tap row to edit`
									: "49 Emergency Medicine Categories (1000+ slots)"}
							</Text>
						</VStack>
					</HStack>

					{selectedCategory && (
						<ExportButton
							module="procedures"
							label="Export"
							size="sm"
							extraParams={{ category: selectedCategory }}
						/>
					)}
				</HStack>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
			>
				{/* MODE 1: 49 CATEGORIES OVERVIEW GRID (when no category selected) */}
				{!selectedCategory && (
					<VStack gap="4">
						{/* Subtitle Banner */}
						<Card variant="default" style={styles.bannerCard}>
							<VStack gap="1">
								<Heading level={4} style={{ color: Colors.foreground }}>
									Skill Progression Track
								</Heading>
								<Text variant="bodySm" color={Colors.muted}>
									Log procedures across all 49 emergency medicine categories. Track progression:{" "}
									<Text style={{ fontWeight: "700", color: Colors.accent }}>
										Simulation → Observed → Assisted → Performed
									</Text>
								</Text>
							</VStack>
						</Card>

						{/* Search Bar */}
						<View style={styles.searchBar}>
							<Search size={18} color={Colors.muted} style={{ marginRight: Spacing["2"] }} />
							<TextInput
								style={styles.searchInput}
								placeholder="Search 49 procedure categories..."
								placeholderTextColor={Colors.muted}
								value={searchQuery}
								onChangeText={setSearchQuery}
							/>
							{searchQuery.length > 0 && (
								<Pressable onPress={() => setSearchQuery("")}>
									<X size={16} color={Colors.muted} />
								</Pressable>
							)}
						</View>

						{/* Categories List Cards Grid */}
						<VStack gap="3">
							{filteredCategories.map((cat: ProcedureCategoryConfig) => {
								const totalFilled = summary?.totalByCategory?.[cat.enumValue] || 0;
								const totalSigned = summary?.signedByCategory?.[cat.enumValue] || 0;
								const maxSlots = cat.maxEntries;

								return (
									<Card
										key={cat.enumValue}
										variant="default"
										style={styles.categoryCard}
										onPress={() => setSelectedCategory(cat.enumValue)}
									>
										<HStack justify="space-between" align="center">
											<VStack gap="1" style={{ flex: 1 }}>
												<Heading level={4}>{cat.label}</Heading>
												<HStack gap="2" align="center">
													<HStack gap="1" align="center">
														<FileText size={13} color={Colors.muted} />
														<Text variant="bodySm" color={Colors.muted}>
															<Text style={{ fontWeight: "700", color: Colors.foreground }}>{totalFilled}</Text> / {maxSlots}
														</Text>
													</HStack>
													<Badge
														label={cat.isCpr ? "S / TM / TL" : "S / O / A / PS / PI"}
														tone="neutral"
													/>
													{totalSigned > 0 && (
														<Badge label={`${totalSigned} signed`} tone="success" />
													)}
												</HStack>
											</VStack>

											<View style={styles.arrowIconContainer}>
												<ChevronRight size={20} color={Colors.muted} />
											</View>
										</HStack>
									</Card>
								);
							})}
						</VStack>
					</VStack>
				)}

				{/* MODE 2: CATEGORY DETAIL VIEW (when category selected) */}
				{selectedCategory && (
					<VStack gap="4">
						{/* Category Progress Card */}
						<Card variant="default" style={styles.progressCard}>
							<HStack justify="space-between" align="center">
								<VStack gap="1" style={{ flex: 1 }}>
									<Heading level={4}>
										{PROCEDURE_CATEGORY_LABELS[selectedCategory] || selectedCategory}
									</Heading>
									<Text variant="bodySm" color={Colors.muted}>
										<Text style={{ fontWeight: "700", color: Colors.foreground }}>{signedCount}</Text> of {activeCategoryConfig?.maxEntries || 0} entries signed off
									</Text>
								</VStack>

								<HStack gap="2" align="center">
									<Badge label={`${totalCount}/${activeCategoryConfig?.maxEntries || 0}`} tone="neutral" />
									{!isFaculty && (
										<Button
											label="Add Row"
											variant="secondary"
											size="sm"
											leftIcon={<Plus size={14} color={Colors.foreground} />}
											onPress={handleAddRow}
											loading={isAddingRow}
										/>
									)}
								</HStack>
							</HStack>

							{activeCategoryConfig?.maxEntries && (
								<View style={styles.progressBarBg}>
									<View
										style={[
											styles.progressBarFill,
											{ width: `${Math.min(100, (signedCount / activeCategoryConfig.maxEntries) * 100)}%` },
										]}
									/>
								</View>
							)}
						</Card>

						{/* Entries List */}
						{entries.map((entry) => (
							<Card key={entry.id} variant="default" style={styles.entryCard}>
								<VStack gap="2">
									{/* Row Header */}
									<HStack justify="space-between" align="center">
										<HStack gap="2" align="center" style={{ flex: 1 }}>
											<View style={styles.slBadge}>
												<Text style={styles.slBadgeText}>{entry.slNo}</Text>
											</View>
											<Heading level={4} style={{ flex: 1 }} numberOfLines={1}>
												Slot #{entry.slNo}
											</Heading>
										</HStack>
										<HStack gap="2" align="center">
											{renderSkillLevelBadge(entry.skillLevel)}
											{renderStatusBadge(entry.status)}
										</HStack>
									</HStack>

									{/* Rejection Remark Banner */}
									{entry.status === "NEEDS_REVISION" && entry.facultyRemark && (
										<View style={styles.rejectionBanner}>
											<Text variant="bodySm" style={{ color: "#C0392B", fontWeight: "600" }}>
												Rejection Reason: {entry.facultyRemark}
											</Text>
										</View>
									)}

									{/* Diagnosis & Details */}
									<VStack gap="1" style={styles.detailsBox}>
										<Text variant="bodySm" color={entry.completeDiagnosis ? Colors.foreground : Colors.muted}>
											<Text style={{ fontWeight: "600" }}>Diagnosis: </Text>
											{entry.completeDiagnosis || "Not filled (tap edit to update)"}
										</Text>
										{entry.procedureDescription && (
											<Text variant="bodySm" color={Colors.foreground}>
												<Text style={{ fontWeight: "600" }}>Description: </Text>
												{entry.procedureDescription}
											</Text>
										)}

										<HStack gap="3" align="center" style={{ marginTop: 2, flexWrap: "wrap" }}>
											{entry.date && (
												<HStack gap="1" align="center">
													<Calendar size={13} color={Colors.muted} />
													<Text variant="bodySm" color={Colors.muted}>
														{new Date(entry.date).toLocaleDateString()}
													</Text>
												</HStack>
											)}
											{entry.patientName && (
												<HStack gap="1" align="center">
													<User size={13} color={Colors.muted} />
													<Text variant="bodySm" color={Colors.muted}>
														{entry.patientName} ({entry.patientAge ? `${entry.patientAge}y/` : ""}{entry.patientSex || ""})
													</Text>
												</HStack>
											)}
											{entry.uhid && (
												<HStack gap="1" align="center">
													<Hash size={13} color={Colors.muted} />
													<Text variant="bodySm" color={Colors.muted}>
														UHID: {entry.uhid}
													</Text>
												</HStack>
											)}
											{entry.performedAtLocation && (
												<HStack gap="1" align="center">
													<MapPin size={13} color={Colors.muted} />
													<Text variant="bodySm" color={Colors.muted}>
														Loc: {entry.performedAtLocation}
													</Text>
												</HStack>
											)}
										</HStack>
									</VStack>

									{/* Action Footer */}
									<HStack justify="space-between" align="center" style={{ marginTop: 4 }}>
										<Text variant="bodySm" color={Colors.muted}>
											{entry.status === "SIGNED"
												? "Signed off by faculty"
												: entry.status === "SUBMITTED"
												? "Pending faculty review"
												: "Draft entry"}
										</Text>

										<HStack gap="2">
											{/* Student Actions */}
											{!isFaculty && (entry.status === "DRAFT" || entry.status === "NEEDS_REVISION") && (
												<>
													<Button
														label="Edit"
														variant="secondary"
														size="sm"
														onPress={() => handleOpenEdit(entry)}
													/>
													{entry.status === "DRAFT" && (
														<Button
															label="Clear"
															variant="ghost"
															size="sm"
															onPress={() => {
																Alert.alert(
																	"Clear Entry Data",
																	"Clear all filled details from this procedure entry?",
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
																					Alert.alert("Cleared", "Procedure draft data cleared.");
																				} catch (err: any) {
																					const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
																					Alert.alert("Error", msg || "Failed to clear entry");
																				}
																			},
																		},
																	]
																);
															}}
														/>
													)}
													<Button
														label="Submit"
														variant="primary"
														size="sm"
														onPress={() => handleSubmit(entry.id)}
														loading={isSubmitting}
													/>
												</>
											)}

											{/* Faculty Review Actions */}
											{isFaculty && entry.status === "SUBMITTED" && (
												<>
													<Button
														label="Revise"
														variant="danger"
														size="sm"
														onPress={() => {
															setRevisionEntryId(entry.id);
															setRevisionModalVisible(true);
														}}
													/>
													<Button
														label="Sign Off"
														variant="primary"
														size="sm"
														onPress={() => handleSign(entry.id)}
														loading={isSigning}
													/>
												</>
											)}
										</HStack>
									</HStack>
								</VStack>
							</Card>
						))}
					</VStack>
				)}
			</ScrollView>

			{/* INLINE EDIT MODAL */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={editModalVisible}
				onRequestClose={() => setEditModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<Card variant="default" style={styles.modalCard}>
						<HStack justify="space-between" align="center" style={{ marginBottom: Spacing["3"] }}>
							<Heading level={3}>Edit Procedure Log #{editingEntry?.slNo}</Heading>
							<Pressable onPress={() => setEditModalVisible(false)}>
								<X size={20} color={Colors.foreground} />
							</Pressable>
						</HStack>

						<ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
							<VStack gap="3">
								{/* Read-Only Category Title */}
								<View>
									<Text variant="bodySm" style={styles.fieldLabel}>Procedure Category</Text>
									<View style={styles.readOnlyTitleBox}>
										<HStack gap="2" align="center">
											<Lock size={14} color={Colors.muted} />
											<Text variant="bodyStrong" color={Colors.foreground} numberOfLines={2}>
												{selectedCategory ? PROCEDURE_CATEGORY_LABELS[selectedCategory] || selectedCategory : ""}
											</Text>
										</HStack>
									</View>
								</View>

								{/* Skill Level Selection */}
								<View>
									<Text variant="bodySm" style={styles.fieldLabel}>Skill Level ({isCpr ? "S / TM / TL" : "S / O / A / PS / PI"})</Text>
									<HStack gap="1" style={{ flexWrap: "wrap", marginTop: 4 }}>
										{skillOptions.map((opt) => {
											const isSelected = editingEntry?.skillLevel === opt.code;
											return (
												<Pressable
													key={opt.code}
													onPress={() => setEditingEntry((prev) => ({ ...prev, skillLevel: opt.code as any }))}
													style={[
														styles.skillOption,
														isSelected && { backgroundColor: opt.color, borderColor: opt.color },
													]}
												>
													<Text style={[styles.skillOptionText, isSelected && { color: "#FFFFFF" }]}>
														{opt.code} — {opt.label}
													</Text>
												</Pressable>
											);
										})}
									</HStack>
								</View>

								{/* Date Picker Button & UHID */}
								<HStack gap="2">
									<View style={{ flex: 1 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Date</Text>
										<Pressable
											style={styles.datePickerBtn}
											onPress={() => setShowDatePicker(true)}
										>
											<HStack gap="2" align="center">
												<Calendar size={16} color={Colors.accent} />
												<Text variant="bodySm" style={{ color: Colors.foreground, fontWeight: "600" }}>
													{editingEntry?.date ? editingEntry.date : "Select Date"}
												</Text>
											</HStack>
										</Pressable>
										{showDatePicker && (
											<DateTimePicker
												value={editingEntry?.date ? new Date(editingEntry.date) : new Date()}
												mode="date"
												display="default"
												onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
													setShowDatePicker(false);
													if (selectedDate) {
														setEditingEntry((prev) => ({
															...prev,
															date: selectedDate.toISOString().split("T")[0],
														}));
													}
												}}
											/>
										)}
									</View>
									<View style={{ flex: 1 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>UHID</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.uhid || ""}
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, uhid: txt }))}
											placeholder="Hospital UHID"
											placeholderTextColor={Colors.muted}
										/>
									</View>
								</HStack>

								{/* Patient Info */}
								<HStack gap="2">
									<View style={{ flex: 2 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Patient Name</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.patientName || ""}
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, patientName: txt }))}
											placeholder="Patient Name"
											placeholderTextColor={Colors.muted}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Age</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.patientAge !== undefined ? String(editingEntry.patientAge) : ""}
											keyboardType="numeric"
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, patientAge: txt ? Number(txt) : undefined }))}
											placeholder="Age"
											placeholderTextColor={Colors.muted}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Sex</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.patientSex || ""}
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, patientSex: txt }))}
											placeholder="M / F"
											placeholderTextColor={Colors.muted}
										/>
									</View>
								</HStack>

								{/* Diagnosis & Description & Location */}
								<View>
									<Text variant="bodySm" style={styles.fieldLabel}>Complete Diagnosis</Text>
									<TextInput
										style={[styles.input, { height: 56 }]}
										multiline
										value={editingEntry?.completeDiagnosis || ""}
										onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, completeDiagnosis: txt }))}
										placeholder="Enter complete clinical diagnosis..."
										placeholderTextColor={Colors.muted}
									/>
								</View>

								<HStack gap="2">
									<View style={{ flex: 2 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Procedure Description</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.procedureDescription || ""}
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, procedureDescription: txt }))}
											placeholder="Describe procedure..."
											placeholderTextColor={Colors.muted}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text variant="bodySm" style={styles.fieldLabel}>Location</Text>
										<TextInput
											style={styles.input}
											value={editingEntry?.performedAtLocation || ""}
											onChangeText={(txt) => setEditingEntry((prev) => ({ ...prev, performedAtLocation: txt }))}
											placeholder="ER / ICU / OT"
											placeholderTextColor={Colors.muted}
										/>
									</View>
								</HStack>

								{/* Supervising Faculty Selector */}
								<View>
									<Text variant="bodySm" style={styles.fieldLabel}>Observing / Supervising Faculty</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
										<HStack gap="2">
											{facultyList.map((fac) => {
												const isSelected = editingEntry?.facultyId === fac.id;
												return (
													<Pressable
														key={fac.id}
														onPress={() => setEditingEntry((prev) => ({ ...prev, facultyId: fac.id }))}
														style={[
															styles.facultyOption,
															isSelected && styles.facultyOptionSelected,
														]}
													>
														<HStack gap="1.5" align="center">
															<UserCheck size={14} color={isSelected ? "#FFFFFF" : Colors.foreground} />
															<Text style={[styles.facultyOptionText, isSelected && { color: "#FFFFFF" }]}>
																Dr. {fac.firstName} {fac.lastName}
															</Text>
														</HStack>
													</Pressable>
												);
											})}
										</HStack>
									</ScrollView>
								</View>
							</VStack>
						</ScrollView>

						<HStack justify="flex-end" gap="2" style={{ marginTop: Spacing["4"] }}>
							<Button label="Cancel" variant="ghost" size="sm" onPress={() => setEditModalVisible(false)} />
							<Button label="Save Changes" variant="primary" size="sm" onPress={handleSaveEdit} loading={isUpdating} />
						</HStack>
					</Card>
				</View>
			</Modal>

			{/* REVISION REMARK MODAL */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={revisionModalVisible}
				onRequestClose={() => setRevisionModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<Card variant="default" style={styles.modalCard}>
						<Heading level={3} style={{ marginBottom: 4 }}>Request Revision</Heading>
						<Text variant="bodySm" color={Colors.muted} style={{ marginBottom: 12 }}>
							Specify the changes required for the resident to update this procedure log.
						</Text>
						<TextInput
							style={[styles.input, { height: 80 }]}
							multiline
							placeholder="Enter feedback or correction details..."
							placeholderTextColor={Colors.muted}
							value={facultyRemarkInput}
							onChangeText={setFacultyRemarkInput}
						/>
						<HStack justify="flex-end" gap="2" style={{ marginTop: 14 }}>
							<Button label="Cancel" variant="ghost" size="sm" onPress={() => setRevisionModalVisible(false)} />
							<Button label="Request Revision" variant="danger" size="sm" onPress={handleConfirmReject} loading={isRejecting} />
						</HStack>
					</Card>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	headerBar: {
		paddingTop: 48,
		paddingBottom: 12,
		paddingHorizontal: Spacing["4"],
		backgroundColor: Colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	backBtn: {
		padding: 4,
	},
	scrollContent: {
		padding: Spacing["4"],
	},
	bannerCard: {
		padding: Spacing["3"],
		borderRadius: Radius.lg,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		paddingHorizontal: Spacing["3"],
		height: 42,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: Colors.foreground,
	},
	categoryCard: {
		padding: Spacing["3"],
		borderRadius: Radius.lg,
	},
	arrowIconContainer: {
		width: 32,
		height: 32,
		borderRadius: Radius.sm,
		backgroundColor: Colors.backgroundAlt,
		justifyContent: "center",
		alignItems: "center",
	},
	progressCard: {
		padding: Spacing["3"],
		borderRadius: Radius.lg,
	},
	progressBarBg: {
		height: 6,
		backgroundColor: Colors.border,
		borderRadius: Radius.pill,
		overflow: "hidden",
		marginTop: Spacing["2"],
	},
	progressBarFill: {
		height: "100%",
		backgroundColor: Colors.accent,
	},
	entryCard: {
		padding: Spacing["3"],
		borderRadius: Radius.lg,
		marginBottom: Spacing["1"],
	},
	slBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: Colors.accent + "20",
		justifyContent: "center",
		alignItems: "center",
	},
	slBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: Colors.accent,
	},
	skillBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: Radius.sm,
		borderWidth: 1,
	},
	skillBadgeText: {
		fontSize: 11,
		fontWeight: "800",
	},
	rejectionBanner: {
		backgroundColor: "rgba(192, 57, 43, 0.08)",
		borderLeftWidth: 3,
		borderLeftColor: "#C0392B",
		padding: 8,
		borderRadius: Radius.sm,
	},
	detailsBox: {
		backgroundColor: Colors.backgroundAlt,
		padding: Spacing["2"],
		borderRadius: Radius.md,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing["4"],
	},
	modalCard: {
		width: "100%",
		maxWidth: 400,
		padding: Spacing["4"],
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
	},
	fieldLabel: {
		fontSize: 12,
		fontWeight: "600",
		color: Colors.muted,
		marginBottom: 4,
	},
	readOnlyTitleBox: {
		backgroundColor: Colors.backgroundAlt,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["2"],
	},
	datePickerBtn: {
		backgroundColor: Colors.backgroundAlt,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["2"],
		justifyContent: "center",
	},
	input: {
		backgroundColor: Colors.backgroundAlt,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["2"],
		fontSize: 14,
		color: Colors.foreground,
	},
	skillOption: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.backgroundAlt,
		marginRight: 4,
		marginBottom: 4,
	},
	skillOptionText: {
		fontSize: 12,
		fontWeight: "700",
		color: Colors.foreground,
	},
	facultyOption: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.backgroundAlt,
		marginRight: 6,
	},
	facultyOptionSelected: {
		backgroundColor: Colors.accent,
		borderColor: Colors.accent,
	},
	facultyOptionText: {
		fontSize: 13,
		fontWeight: "600",
		color: Colors.foreground,
	},
});
