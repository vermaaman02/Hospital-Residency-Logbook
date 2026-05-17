/**
 * Profile screen — Clerk identity + DB user record + sign-out.
 *
 * Acts as the canonical "auth flow works" diagnostic page: if name,
 * email, role, and IDs render correctly, the entire auth + API
 * pipeline is healthy.
 */

import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react-native";

import { useMe } from "@/lib/hooks/useMe";
import { setAuthToken } from "@/lib/api/client";
import {
	Badge,
	Button,
	Card,
	Divider,
	Heading,
	IconBubble,
	Screen,
	SectionHeader,
	Squiggle,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Spacing } from "@/lib/theme";

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const { user: clerkUser } = useUser();
	const qc = useQueryClient();
	const { data: me } = useMe();

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

	const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || "—";

	return (
		<Screen scroll>
			<SectionHeader title="Profile" squiggleColor={Colors.accent} />

			{/* HERO */}
			<Card variant="featured-violet">
				<VStack gap="3" align="center">
					<IconBubble
						tone="accent"
						size={84}
						icon={
							<Text variant="h2" color={Colors.inverse}>
								{(me?.firstName?.[0] ?? "?").toUpperCase()}
							</Text>
						}
					/>
					<Heading level={2}>{fullName}</Heading>
					<Text variant="muted">{me?.email ?? "—"}</Text>
					{me?.role && (
						<Badge label={me.role.toUpperCase()} tone="accent" />
					)}
				</VStack>
			</Card>

			{/* DB RECORD */}
			<View style={styles.section}>
				<SectionHeader title="Database record" />
				<Card>
					<VStack gap="3">
						<Row label="Batch" value={me?.batch ?? "—"} />
						<Divider />
						<Row label="Semester" value={me?.currentSemester?.toString() ?? "—"} />
						<Divider />
						<Row label="Department" value={me?.department ?? "—"} />
						<Divider />
						<Row label="Status" value={me?.status ?? "—"} />
						<Divider />
						<Row
							label="User ID"
							value={(me?.id ?? "—").slice(0, 18) + "…"}
							mono
						/>
					</VStack>
				</Card>
			</View>

			{/* CLERK */}
			<View style={styles.section}>
				<SectionHeader title="Clerk session" />
				<Card>
					<VStack gap="3">
						<Row
							label="Clerk ID"
							value={(clerkUser?.id ?? "—").slice(0, 18) + "…"}
							mono
						/>
						<Divider />
						<Row
							label="Email"
							value={clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}
						/>
						<Divider />
						<Row
							label="Created"
							value={
								clerkUser?.createdAt
									? new Date(clerkUser.createdAt).toLocaleDateString()
									: "—"
							}
						/>
					</VStack>
				</Card>
			</View>

			<Button
				label="Sign out"
				variant="danger"
				leftIcon={<LogOut size={18} color={Colors.inverse} strokeWidth={2.5} />}
				onPress={handleSignOut}
				fullWidth
				style={{ marginTop: Spacing["4"] }}
			/>
		</Screen>
	);
}

function Row({
	label,
	value,
	mono,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<View style={styles.row}>
			<Text variant="muted">{label}</Text>
			<Text
				variant={mono ? "mono" : "bodyStrong"}
				numberOfLines={1}
				style={styles.value}
			>
				{value}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	section: { gap: Spacing["3"], marginTop: Spacing["4"] },
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: Spacing["3"],
	},
	value: { textAlign: "right", flexShrink: 1 },
});
