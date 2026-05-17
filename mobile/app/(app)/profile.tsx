/**
 * Profile screen — shows user info from Clerk + DB, and sign-out.
 * This is the primary auth test screen — if you see your name, email,
 * and role here, the entire auth flow is working correctly.
 */

import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Alert,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/hooks/useMe";
import { setAuthToken } from "@/lib/api/client";
import { Colors, Font, Spacing, Radius } from "@/lib/theme";

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const { user: clerkUser } = useUser();
	const qc = useQueryClient();
	const { data: me } = useMe();

	async function handleSignOut() {
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
	}

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Profile</Text>

				{/* Avatar + Name */}
				<View style={styles.avatarCard}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{(me?.firstName?.[0] ?? "?").toUpperCase()}
						</Text>
					</View>
					<Text style={styles.name}>
						{[me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
							"—"}
					</Text>
					<Text style={styles.email}>{me?.email ?? "—"}</Text>
				</View>

				{/* Info card — from DB */}
				<View style={styles.infoCard}>
					<Text style={styles.sectionLabel}>Database Record</Text>
					<InfoRow label="Role" value={me?.role ?? "—"} highlight />
					<InfoRow label="Batch" value={me?.batch ?? "—"} />
					<InfoRow
						label="Semester"
						value={me?.currentSemester?.toString() ?? "—"}
					/>
					<InfoRow label="Department" value={me?.department ?? "—"} />
					<InfoRow label="Status" value={me?.status ?? "—"} />
					<InfoRow
						label="DB User ID"
						value={me?.id?.slice(0, 16) + "..." || "—"}
						mono
					/>
				</View>

				{/* Info card — from Clerk */}
				<View style={styles.infoCard}>
					<Text style={styles.sectionLabel}>Clerk Session</Text>
					<InfoRow
						label="Clerk ID"
						value={clerkUser?.id?.slice(0, 16) + "..." || "—"}
						mono
					/>
					<InfoRow
						label="Email"
						value={
							clerkUser?.primaryEmailAddress?.emailAddress ?? "—"
						}
					/>
					<InfoRow
						label="Created"
						value={
							clerkUser?.createdAt
								? new Date(clerkUser.createdAt).toLocaleDateString()
								: "—"
						}
					/>
				</View>

				{/* Sign out */}
				<Pressable
					style={({ pressed }) => [
						styles.signOutBtn,
						pressed && { opacity: 0.8 },
					]}
					onPress={handleSignOut}
				>
					<Text style={styles.signOutText}>Sign out</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}

function InfoRow({
	label,
	value,
	highlight,
	mono,
}: {
	label: string;
	value: string;
	highlight?: boolean;
	mono?: boolean;
}) {
	return (
		<View style={styles.infoRow}>
			<Text style={styles.infoLabel}>{label}</Text>
			{highlight ? (
				<View style={styles.roleBadge}>
					<Text style={styles.roleBadgeText}>
						{value.toUpperCase()}
					</Text>
				</View>
			) : (
				<Text
					style={[styles.infoValue, mono && styles.mono]}
					numberOfLines={1}
				>
					{value}
				</Text>
			)}
		</View>
	);
}

import { Platform } from "react-native";

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.bg },
	container: { padding: Spacing.xl, gap: Spacing.lg },
	title: {
		fontSize: Font.size.xxl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},

	// Avatar card
	avatarCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xxl,
		alignItems: "center",
		gap: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: Colors.primary,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.sm,
	},
	avatarText: {
		fontSize: 32,
		fontWeight: Font.weight.bold,
		color: "#fff",
	},
	name: {
		fontSize: Font.size.xl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	email: {
		fontSize: Font.size.sm,
		color: Colors.textMuted,
	},

	// Info card
	infoCard: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
		gap: Spacing.xs,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	sectionLabel: {
		fontSize: Font.size.xs,
		fontWeight: Font.weight.bold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: Spacing.sm,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: Colors.bg,
	},
	infoLabel: {
		fontSize: Font.size.sm,
		color: Colors.textMuted,
	},
	infoValue: {
		fontSize: Font.size.sm,
		color: Colors.textPrimary,
		fontWeight: Font.weight.medium,
		flexShrink: 1,
		textAlign: "right",
		textTransform: "capitalize",
	},
	mono: {
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
		textTransform: "none",
	},
	roleBadge: {
		backgroundColor: Colors.accent + "20",
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
	},
	roleBadgeText: {
		color: Colors.accentGlow,
		fontSize: Font.size.xs,
		fontWeight: Font.weight.bold,
		letterSpacing: 1,
	},

	// Sign out
	signOutBtn: {
		backgroundColor: Colors.errorBg,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		alignItems: "center",
		marginTop: Spacing.sm,
	},
	signOutText: {
		color: "#fca5a5",
		fontWeight: Font.weight.semibold,
		fontSize: Font.size.md,
	},
});
