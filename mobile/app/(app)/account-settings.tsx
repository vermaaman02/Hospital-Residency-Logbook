/**
 * Account Settings screen — native Clerk account management.
 *
 *  - Change password (user.updatePassword)
 *  - Active sessions list (user.getSessions) with revoke
 *  - Update profile picture (user.setProfileImage)
 *
 * Hidden from the tab bar via `href: null` in the layout.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useUser, useSession } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
	ArrowLeft,
	Camera,
	KeyRound,
	Monitor,
	Smartphone,
	Trash2,
} from "lucide-react-native";

import {
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
import { Colors, Layout, Radius, Spacing } from "@/lib/theme";

type SessionInfo = {
	id: string;
	status: string;
	lastActiveAt: Date;
	latestActivity: {
		browserName?: string;
		deviceType?: string;
		ipAddress?: string;
		city?: string;
		country?: string;
		isMobile?: boolean;
	};
	isCurrent: boolean;
};

export default function AccountSettingsScreen() {
	const router = useRouter();
	const { user } = useUser();
	const { session: currentSession } = useSession();

	// Password state
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	// Sessions state
	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [isLoadingSessions, setIsLoadingSessions] = useState(true);
	const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

	// Profile picture state
	const [isUploadingImage, setIsUploadingImage] = useState(false);

	// Load sessions
	const loadSessions = useCallback(async () => {
		if (!user) return;
		setIsLoadingSessions(true);
		try {
			const activeSessions = await user.getSessions();
			const mapped: SessionInfo[] = activeSessions.map((s) => ({
				id: s.id,
				status: s.status,
				lastActiveAt: s.lastActiveAt,
				latestActivity: {
					browserName: s.latestActivity?.browserName ?? undefined,
					deviceType: s.latestActivity?.deviceType ?? undefined,
					ipAddress: s.latestActivity?.ipAddress ?? undefined,
					city: s.latestActivity?.city ?? undefined,
					country: s.latestActivity?.country ?? undefined,
					isMobile: s.latestActivity?.isMobile ?? undefined,
				},
				isCurrent: s.id === currentSession?.id,
			}));
			setSessions(mapped);
		} catch (e) {
			console.error("Failed to load sessions:", e);
		} finally {
			setIsLoadingSessions(false);
		}
	}, [user, currentSession?.id]);

	useEffect(() => {
		loadSessions();
	}, [loadSessions]);

	// Change password handler
	const handleChangePassword = async () => {
		if (!newPassword || !confirmPassword) {
			Alert.alert("Error", "Please fill in all password fields.");
			return;
		}
		if (newPassword !== confirmPassword) {
			Alert.alert("Error", "New passwords do not match.");
			return;
		}
		if (newPassword.length < 8) {
			Alert.alert("Error", "Password must be at least 8 characters.");
			return;
		}

		setIsChangingPassword(true);
		try {
			await user?.updatePassword({
				currentPassword: currentPassword || undefined,
				newPassword,
				signOutOfOtherSessions: false,
			});
			Alert.alert("Success", "Password updated successfully.");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (error: any) {
			const msg =
				error?.errors?.[0]?.longMessage ??
				error?.errors?.[0]?.message ??
				"Failed to update password.";
			Alert.alert("Error", msg);
		} finally {
			setIsChangingPassword(false);
		}
	};

	// Revoke session handler
	const handleRevokeSession = (sessionId: string) => {
		Alert.alert(
			"Revoke Session",
			"This will sign out this device. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Revoke",
					style: "destructive",
					onPress: async () => {
						setRevokingSessionId(sessionId);
						try {
							const activeSessions = await user?.getSessions();
							const target = activeSessions?.find((s) => s.id === sessionId);
							if (target) {
								await target.revoke();
								await loadSessions();
								Alert.alert("Done", "Session revoked successfully.");
							}
						} catch (error: any) {
							const msg =
								error?.errors?.[0]?.message ?? "Failed to revoke session.";
							Alert.alert("Error", msg);
						} finally {
							setRevokingSessionId(null);
						}
					},
				},
			],
		);
	};

	// Profile picture upload
	const handleProfilePictureUpload = async () => {
		try {
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				Alert.alert(
					"Permission required",
					"Please grant camera roll permissions to upload a profile picture.",
				);
				return;
			}

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

				await user?.setProfileImage({ file });
				Alert.alert("Success", "Profile picture updated.");
			}
		} catch (error: any) {
			const msg = error?.errors?.[0]?.message ?? "Failed to upload image.";
			Alert.alert("Error", msg);
		} finally {
			setIsUploadingImage(false);
		}
	};

	// Remove profile picture
	const handleRemoveProfilePicture = () => {
		Alert.alert(
			"Remove Picture",
			"Are you sure you want to remove your profile picture?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						setIsUploadingImage(true);
						try {
							await user?.setProfileImage({ file: null });
							Alert.alert("Done", "Profile picture removed.");
						} catch (error: any) {
							Alert.alert("Error", "Failed to remove profile picture.");
						} finally {
							setIsUploadingImage(false);
						}
					},
				},
			],
		);
	};

	const hasPassword = user?.passwordEnabled;

	return (
		<Screen bleed>
			<ScrollView
				contentContainerStyle={styles.scroll}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<HStack gap="3" align="center" style={styles.header}>
					<Pressable onPress={() => router.back()} hitSlop={12}>
						<ArrowLeft size={22} color={Colors.foreground} strokeWidth={2.5} />
					</Pressable>
					<Heading level={2}>Account Settings</Heading>
				</HStack>

				{/* ── PROFILE PICTURE ── */}
				<View style={styles.section}>
					<SectionHeader title="Profile Picture" />
					<Card>
						<VStack gap="3" align="center">
							{user?.imageUrl ? (
								<Image
									source={{ uri: user.imageUrl }}
									style={styles.avatar}
								/>
							) : (
								<View style={[styles.avatar, styles.avatarFallback]}>
									<Text variant="h1" color={Colors.inverse}>
										{(user?.firstName?.[0] ?? "?").toUpperCase()}
									</Text>
								</View>
							)}
							<HStack gap="3">
								<Button
									label="Change"
									variant="secondary"
									size="sm"
									leftIcon={
										<Camera size={14} color={Colors.accent} strokeWidth={2.5} />
									}
									onPress={handleProfilePictureUpload}
									loading={isUploadingImage}
								/>
								{user?.imageUrl && (
									<Button
										label="Remove"
										variant="ghost"
										size="sm"
										leftIcon={
											<Trash2
												size={14}
												color={Colors.danger}
												strokeWidth={2.5}
											/>
										}
										onPress={handleRemoveProfilePicture}
									/>
								)}
							</HStack>
						</VStack>
					</Card>
				</View>

				{/* ── CHANGE PASSWORD ── */}
				<View style={styles.section}>
					<SectionHeader title="Change Password" />
					<Card>
						<VStack gap="3">
							{hasPassword && (
								<View style={styles.inputWrap}>
									<Text variant="label" color={Colors.muted}>
										Current Password
									</Text>
									<TextInput
										style={styles.input}
										value={currentPassword}
										onChangeText={setCurrentPassword}
										secureTextEntry
										placeholder="Enter current password"
										placeholderTextColor={Colors.muted}
										autoCapitalize="none"
									/>
								</View>
							)}
							<View style={styles.inputWrap}>
								<Text variant="label" color={Colors.muted}>
									New Password
								</Text>
								<TextInput
									style={styles.input}
									value={newPassword}
									onChangeText={setNewPassword}
									secureTextEntry
									placeholder="Enter new password (min 8 chars)"
									placeholderTextColor={Colors.muted}
									autoCapitalize="none"
								/>
							</View>
							<View style={styles.inputWrap}>
								<Text variant="label" color={Colors.muted}>
									Confirm Password
								</Text>
								<TextInput
									style={styles.input}
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									secureTextEntry
									placeholder="Confirm new password"
									placeholderTextColor={Colors.muted}
									autoCapitalize="none"
								/>
							</View>
							<Button
								label="Update Password"
								variant="primary"
								leftIcon={
									<KeyRound
										size={16}
										color={Colors.inverse}
										strokeWidth={2.5}
									/>
								}
								onPress={handleChangePassword}
								loading={isChangingPassword}
								fullWidth
							/>
						</VStack>
					</Card>
				</View>

				{/* ── ACTIVE SESSIONS ── */}
				<View style={styles.section}>
					<SectionHeader title="Active Sessions" />
					<Card>
						{isLoadingSessions ? (
							<ActivityIndicator color={Colors.accent} />
						) : sessions.length === 0 ? (
							<Text variant="muted">No active sessions found.</Text>
						) : (
							<VStack gap="3">
								{sessions.map((s, i) => (
									<React.Fragment key={s.id}>
										{i > 0 && <Divider />}
										<View style={styles.sessionRow}>
											<HStack gap="3" align="center" style={styles.sessionInfo}>
												<IconBubble
													tone={s.latestActivity.isMobile ? "accent" : "sky"}
													size={36}
													icon={
														s.latestActivity.isMobile ? (
															<Smartphone
																size={16}
																color={Colors.inverse}
																strokeWidth={2.5}
															/>
														) : (
															<Monitor
																size={16}
																color={Colors.inverse}
																strokeWidth={2.5}
															/>
														)
													}
												/>
												<VStack gap="0.5" style={styles.sessionText}>
													<Text variant="bodyStrong" numberOfLines={1}>
														{s.latestActivity.browserName ?? "Unknown browser"}
														{s.isCurrent ? " (This device)" : ""}
													</Text>
													<Text variant="bodySm" color={Colors.muted} numberOfLines={1}>
														{[
															s.latestActivity.city,
															s.latestActivity.country,
														]
															.filter(Boolean)
															.join(", ") || s.latestActivity.ipAddress || "Unknown location"}
													</Text>
													<Text variant="label" color={Colors.muted}>
														{s.lastActiveAt
															? new Date(s.lastActiveAt).toLocaleDateString(
																	"en-IN",
																	{
																		day: "numeric",
																		month: "short",
																		hour: "2-digit",
																		minute: "2-digit",
																	},
																)
															: "—"}
													</Text>
												</VStack>
											</HStack>
											{!s.isCurrent && (
												<Button
													label="Revoke"
													variant="ghost"
													size="sm"
													onPress={() => handleRevokeSession(s.id)}
													loading={revokingSessionId === s.id}
												/>
											)}
										</View>
									</React.Fragment>
								))}
							</VStack>
						)}
					</Card>
				</View>
			</ScrollView>
		</Screen>
	);
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
	scroll: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
		gap: Spacing["4"],
		paddingTop: Spacing["2"],
	},
	header: {
		paddingVertical: Spacing["3"],
	},
	section: {
		gap: Spacing["3"],
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
	inputWrap: {
		gap: Spacing["1"],
	},
	input: {
		borderWidth: 2,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		paddingHorizontal: Spacing["3"],
		paddingVertical: Spacing["3"],
		fontSize: 15,
		color: Colors.foreground,
		backgroundColor: Colors.surface,
	},
	sessionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	sessionInfo: {
		flex: 1,
	},
	sessionText: {
		flex: 1,
	},
});
