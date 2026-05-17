/**
 * Profile screen — full user profile matching web dashboard features.
 *
 *  - Profile hero with picture, name, email, role badge.
 *  - Account information: department, batch, semester, status, joined date.
 *  - Account settings: change profile picture, manage password/sessions.
 *  - Thesis card (student only).
 *  - Assigned faculty / students.
 *  - Logbook summary stats.
 *  - Sign-out button.
 *
 * Data is fetched dynamically from /api/v1/me/profile-full.
 */

import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
	Activity,
	BookOpen,
	Calendar,
	Camera,
	ClipboardList,
	FileCheck,
	GraduationCap,
	LogOut,
	Settings,
	Syringe,
	Users,
} from "lucide-react-native";

import { useProfileFull } from "@/lib/hooks/useProfileFull";
import { setAuthToken } from "@/lib/api/client";
import {
	Badge,
	Button,
	Card,
	Divider,
	Heading,
	HStack,
	IconBubble,
	Screen,
	SectionHeader,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Layout, Spacing } from "@/lib/theme";

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const { user: clerkUser } = useUser();
	const qc = useQueryClient();
	const router = useRouter();
	const { data: profile, isLoading, refetch, isRefetching } = useProfileFull();

	// Profile picture upload state
	const [isUploadingImage, setIsUploadingImage] = useState(false);

	const handleSignOut = () => {
		Alert.alert("Sign out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: async () => {
					setAuthToken(null);
					qc.clear();
					await signOut();
				},
			},
		]);
	};

	const handleProfilePictureUpload = async () => {
		try {
			// Request permission
			const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				Alert.alert("Permission required", "Please grant camera roll permissions to upload a profile picture.");
				return;
			}

			// Pick image
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets[0]) {
				setIsUploadingImage(true);
				const file = {
					uri: result.assets[0].uri,
					name: "profile-picture.jpg",
					type: "image/jpeg",
				} as any;

				// Upload to Clerk
				await clerkUser?.setProfileImage({ file });

				// Sync to backend
				try {
					await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1/me/profile`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${clerkUser?.id}`,
						},
						body: JSON.stringify({ profileImage: clerkUser?.imageUrl }),
					});
				} catch (e) {
					console.warn("Failed to sync profile image to backend:", e);
				}

				// Refresh data
				await refetch();
				Alert.alert("Success", "Profile picture updated successfully.");
			}
		} catch (error) {
			Alert.alert("Error", "Failed to upload profile picture.");
			console.error(error);
		} finally {
			setIsUploadingImage(false);
		}
	};

	const profileUrl = clerkUser?.imageUrl ?? profile?.profileImage ?? null;
	const initial = (profile?.firstName?.[0] ?? "?").toUpperCase();
	const fullName =
		[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—";
	const isStudent = profile?.role === "Student";
	const isFaculty = profile?.role === "Faculty";

	return (
		<Screen bleed pattern="dots">
			<ScrollView
				contentContainerStyle={styles.scroll}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={Colors.accent}
						colors={[Colors.accent]}
					/>
				}
				showsVerticalScrollIndicator={false}
			>
				<SectionHeader title="My Profile" squiggleColor={Colors.accent} />

				{/* ── HERO ── */}
				<Card variant="featured-violet">
					<VStack gap="3" align="center">
						{profileUrl ? (
							<Image
								source={{ uri: profileUrl }}
								style={styles.avatar}
								accessibilityLabel="Profile picture"
							/>
						) : (
							<View style={[styles.avatar, styles.avatarFallback]}>
								<Text variant="h1" color={Colors.inverse}>
									{initial}
								</Text>
							</View>
						)}
						<Heading level={2}>{fullName}</Heading>
						<Text variant="muted">{profile?.email ?? "—"}</Text>
						<HStack gap="2">
							{profile?.role && (
								<Badge
									label={profile.role.toUpperCase()}
									tone="accent"
								/>
							)}
							{profile?.status && (
								<Badge
									label={profile.status}
									tone={profile.status === "ACTIVE" ? "success" : "danger"}
								/>
							)}
						</HStack>
					</VStack>
				</Card>

				{/* ── ACCOUNT INFORMATION ── */}
				<View style={styles.section}>
					<SectionHeader title="Account Information" />
					<Card>
						<VStack gap="3">
							<Row
								label="Name"
								value={fullName}
							/>
							<Divider />
							<Row
								label="Role"
								value={profile?.role ?? "—"}
							/>
							{profile?.department && (
								<>
									<Divider />
									<Row label="Department" value={profile.department} />
								</>
							)}
							{isStudent && profile?.batch && (
								<>
									<Divider />
									<Row label="Batch" value={profile.batch} />
								</>
							)}
							{isStudent && profile?.currentSemester != null && (
								<>
									<Divider />
									<Row
										label="Semester"
										value={`Semester ${profile.currentSemester}`}
									/>
								</>
							)}
							{profile?.joinedAt && (
								<>
									<Divider />
									<Row
										label="Joined"
										value={new Date(profile.joinedAt).toLocaleDateString(
											"en-IN",
											{ year: "numeric", month: "short", day: "numeric" },
										)}
									/>
								</>
							)}
						</VStack>
					</Card>
				</View>

				{/* ── ACCOUNT SETTINGS ── */}
				<View style={styles.section}>
					<SectionHeader title="Account Settings" />
					<VStack gap="3">
						<Button
							label="Change Profile Picture"
							variant="secondary"
							leftIcon={<Camera size={18} color={Colors.accent} strokeWidth={2.5} />}
							onPress={handleProfilePictureUpload}
							loading={isUploadingImage}
							fullWidth
						/>
						<Button
							label="Manage Account"
							variant="secondary"
							leftIcon={<Settings size={18} color={Colors.accent} strokeWidth={2.5} />}
							onPress={() => router.push("/(app)/account-settings")}
							fullWidth
						/>
					</VStack>
				</View>

				{/* ── THESIS (student only) ── */}
				{isStudent && profile?.thesisTopic && (
					<View style={styles.section}>
						<SectionHeader title="Thesis" />
						<Card variant="featured-violet">
							<VStack gap="3">
								<HStack gap="2" align="center">
									<IconBubble
										tone="accent"
										size={36}
										icon={
											<BookOpen
												size={18}
												color={Colors.inverse}
												strokeWidth={2.5}
											/>
										}
									/>
									<Heading level={4}>Research Thesis</Heading>
								</HStack>
								<Row label="Topic" value={profile.thesisTopic} />
								{profile.thesisGuide && (
									<>
										<Divider />
										<Row label="Chief Guide" value={profile.thesisGuide} />
									</>
								)}
								{profile.thesisStatus && (
									<>
										<Divider />
										<Row label="Status" value={profile.thesisStatus} />
									</>
								)}
							</VStack>
						</Card>
					</View>
				)}

				{/* ── ASSIGNED FACULTY (student) ── */}
				{isStudent &&
					profile?.assignedFaculty &&
					profile.assignedFaculty.length > 0 && (
						<View style={styles.section}>
							<SectionHeader title="Assigned Faculty" />
							<Card>
								<VStack gap="2">
									{profile.assignedFaculty.map((f, i) => (
										<View key={i} style={styles.assignmentRow}>
											<HStack gap="2" align="center" style={styles.assignFlex}>
												<IconBubble
													tone="mint"
													size={32}
													icon={
														<GraduationCap
															size={16}
															color={Colors.inverse}
															strokeWidth={2.5}
														/>
													}
												/>
												<Text variant="bodyStrong">{f.name}</Text>
											</HStack>
											<Badge
												label={`Sem ${f.semester}`}
												tone="info"
											/>
										</View>
									))}
								</VStack>
							</Card>
						</View>
					)}

				{/* ── ASSIGNED STUDENTS (faculty) ── */}
				{isFaculty &&
					profile?.assignedStudents &&
					profile.assignedStudents.length > 0 && (
						<View style={styles.section}>
							<SectionHeader title="Assigned Students" />
							<Card>
								<VStack gap="2">
									{profile.assignedStudents.map((s, i) => (
										<View key={i} style={styles.assignmentRow}>
											<HStack gap="2" align="center" style={styles.assignFlex}>
												<IconBubble
													tone="sky"
													size={32}
													icon={
														<Users
															size={16}
															color={Colors.inverse}
															strokeWidth={2.5}
														/>
													}
												/>
												<Text variant="bodyStrong">{s.name}</Text>
											</HStack>
											<Badge
												label={`Sem ${s.semester}`}
												tone="info"
											/>
										</View>
									))}
								</VStack>
							</Card>
						</View>
					)}

				{/* ── LOGBOOK SUMMARY (student) ── */}
				{isStudent && profile?.logbookStats &&
					Object.keys(profile.logbookStats).length > 0 && (
						<View style={styles.section}>
							<SectionHeader title="Logbook Summary" />
							<Card>
								<VStack gap="2">
									{profile.logbookStats.caseManagement !== undefined && (
										<StatRow
											icon={
												<ClipboardList
													size={16}
													color={Colors.info}
													strokeWidth={2.5}
												/>
											}
											label="Case Logs"
											value={profile.logbookStats.caseManagement}
										/>
									)}
									{profile.logbookStats.procedures !== undefined && (
										<StatRow
											icon={
												<Syringe
													size={16}
													color={Colors.accent}
													strokeWidth={2.5}
												/>
											}
											label="Procedures"
											value={profile.logbookStats.procedures}
										/>
									)}
									{profile.logbookStats.diagnostics !== undefined && (
										<StatRow
											icon={
												<Activity
													size={16}
													color={Colors.warning}
													strokeWidth={2.5}
												/>
											}
											label="Diagnostics"
											value={profile.logbookStats.diagnostics}
										/>
									)}
									{profile.logbookStats.attendance !== undefined && (
										<StatRow
											icon={
												<Calendar
													size={16}
													color={Colors.success}
													strokeWidth={2.5}
												/>
											}
											label="Attendance"
											value={profile.logbookStats.attendance}
										/>
									)}
								</VStack>
							</Card>
						</View>
					)}

				{/* ── ACTIVITY SUMMARY (faculty) ── */}
				{isFaculty && profile?.logbookStats &&
					Object.keys(profile.logbookStats).length > 0 && (
						<View style={styles.section}>
							<SectionHeader title="Activity Summary" />
							<Card>
								<VStack gap="2">
									{profile.logbookStats.signedEntries !== undefined && (
										<StatRow
											icon={
												<FileCheck
													size={16}
													color={Colors.success}
													strokeWidth={2.5}
												/>
											}
											label="Entries Signed"
											value={profile.logbookStats.signedEntries}
										/>
									)}
									{profile.logbookStats.assignedStudents !== undefined && (
										<StatRow
											icon={
												<Users
													size={16}
													color={Colors.info}
													strokeWidth={2.5}
												/>
											}
											label="Students Assigned"
											value={profile.logbookStats.assignedStudents}
										/>
									)}
								</VStack>
							</Card>
						</View>
					)}

				{/* ── SIGN OUT ── */}
				<Button
					label="Sign out"
					variant="danger"
					leftIcon={
						<LogOut size={18} color={Colors.inverse} strokeWidth={2.5} />
					}
					onPress={handleSignOut}
					fullWidth
					style={{ marginTop: Spacing["2"] }}
				/>

				{isLoading && (
					<ActivityIndicator
						color={Colors.accent}
						style={{ marginTop: Spacing["4"] }}
					/>
				)}
			</ScrollView>
		</Screen>
	);
}

/* ─────────────────────────────────────────────────────────────────── */

function Row({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<View style={styles.row}>
			<Text variant="muted">{label}</Text>
			<Text
				variant="bodyStrong"
				numberOfLines={2}
				style={styles.value}
			>
				{value}
			</Text>
		</View>
	);
}

function StatRow({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
}) {
	return (
		<View style={styles.statRow}>
			<HStack gap="2" align="center">
				{icon}
				<Text variant="muted">{label}</Text>
			</HStack>
			<Heading level={4}>{value}</Heading>
		</View>
	);
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
	scroll: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
		gap: Spacing["4"],
		paddingTop: Spacing["2"],
	},
	avatar: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		borderWidth: 3,
		borderColor: Colors.accent,
	},
	avatarFallback: {
		backgroundColor: Colors.accentDark,
		alignItems: "center",
		justifyContent: "center",
	},
	section: {
		gap: Spacing["3"],
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: Spacing["3"],
	},
	value: {
		textAlign: "right",
		flexShrink: 1,
	},
	assignmentRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing["1"],
	},
	assignFlex: {
		flex: 1,
	},
	statRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing["1"],
	},
});
