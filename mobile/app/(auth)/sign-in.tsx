/**
 * Sign-In screen — Clerk Expo v3 (Core 3) custom password flow.
 *
 * Built entirely from `@/components/ui` primitives + `@/lib/theme` tokens.
 * No raw colors, no inline styles for spacing — strictly Design.md.
 *
 * @see https://clerk.com/docs/custom-flows/email-password
 */

import React, { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link, type Href } from "expo-router";
import { useSignIn, useAuth } from "@clerk/expo";
import { Stethoscope, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react-native";

import {
	Button,
	Card,
	Confetti,
	Heading,
	IconBubble,
	Input,
	Squiggle,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Spacing } from "@/lib/theme";
import { DotGrid } from "@/components/ui/DotGrid";

export default function SignInScreen() {
	const { signIn, errors: rawErrors, fetchStatus } = useSignIn();
	const errors = rawErrors as any;
	const { isSignedIn } = useAuth();
	const router = useRouter();

	const [emailAddress, setEmailAddress] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");

	const isLoading = fetchStatus === "fetching";

	const handleSubmit = async () => {
		const { error } = await signIn.password({
			emailAddress: emailAddress.trim().toLowerCase(),
			password,
		});
		if (error) {
			console.error("Sign-in error:", JSON.stringify(error, null, 2));
			return;
		}
		if (signIn.status === "complete") {
			await signIn.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) return;
					router.replace(decorateUrl("/") as Href);
				},
			});
		} else if (signIn.status === "needs_client_trust") {
			const emailCode = signIn.supportedSecondFactors?.find(
				(f: any) => f.strategy === "email_code",
			);
			if (emailCode) await signIn.mfa.sendEmailCode();
		}
	};

	const handleVerify = async () => {
		await signIn.mfa.verifyEmailCode({ code });
		if (signIn.status === "complete") {
			await signIn.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) return;
					router.replace(decorateUrl("/") as Href);
				},
			});
		}
	};

	if (isSignedIn) return null;

	// ─── Client-trust / MFA verification ──────────────────────────
	if (signIn.status === "needs_client_trust") {
		return (
			<SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
				<DotGrid />
				<ScrollView
					style={styles.flex}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="always"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.hero}>
						<IconBubble icon={<ShieldCheck color={Colors.inverse} size={28} strokeWidth={2.5} />} tone="accent" size={64} />
						<Heading level={1} style={styles.heroTitle}>Verify your account</Heading>
						<Text variant="muted" style={styles.center}>
							We sent a 6-digit code to your email.
						</Text>
					</View>

					<Card>
						<VStack gap="4">
							<Input
								label="Verification code"
								value={code}
								onChangeText={setCode}
								placeholder="123456"
								keyboardType="number-pad"
								autoFocus
								error={errors?.fields?.code?.message}
							/>
							<Button
								label={isLoading ? "Verifying…" : "Verify"}
								onPress={handleVerify}
								loading={isLoading}
								disabled={!code}
								fullWidth
							/>
							<Button
								label="Resend code"
								variant="ghost"
								onPress={() => signIn.mfa.sendEmailCode()}
							/>
						</VStack>
					</Card>
				</ScrollView>
			</SafeAreaView>
		);
	}

	// ─── Email + password ─────────────────────────────────────────
	return (
		<SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
			<DotGrid />
			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="always"
				showsVerticalScrollIndicator={false}
			>
				<Confetti count={8} seed={11} opacity={0.6} />

				<View style={styles.hero}>
					<IconBubble
						icon={<Stethoscope color={Colors.inverse} size={28} strokeWidth={2.5} />}
						tone="accent"
						size={68}
					/>
					<Heading level={1} style={styles.heroTitle}>
						Welcome back
					</Heading>
					<Squiggle color={Colors.pink} width={80} height={10} waves={3} />
					<Text variant="muted" style={styles.center}>
						AIIMS Patna Resident Logbook
					</Text>
				</View>

				<Card>
					<VStack gap="4">
						<Input
							label="Email"
							value={emailAddress}
							onChangeText={setEmailAddress}
							placeholder="resident@aiims.edu"
							keyboardType="email-address"
							autoCapitalize="none"
							autoComplete="email"
							error={errors?.fields?.emailAddress?.message}
						/>
						<Input
							label="Password"
							value={password}
							onChangeText={setPassword}
							placeholder="••••••••"
							secureTextEntry
							autoComplete="password"
							error={
								errors?.fields?.password?.message ??
								errors?.global?.[0]?.message
							}
						/>

						<Button
							label={isLoading ? "Signing in…" : "Sign in"}
							onPress={handleSubmit}
							loading={isLoading}
							disabled={!emailAddress || !password}
							fullWidth
							rightIcon={<ArrowRight color={Colors.inverse} size={18} strokeWidth={2.5} />}
						/>
					</VStack>
				</Card>

				<View style={styles.footer}>
					<Text variant="muted">New resident? </Text>
					<Link href="/(auth)/sign-up" asChild>
						<Text variant="bodyStrong" color={Colors.accent}>
							Create an account
						</Text>
					</Link>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	safe: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	scrollContent: {
		paddingBottom: Spacing["8"],
	},
	hero: {
		alignItems: "center",
		gap: Spacing["3"],
		marginTop: Spacing["8"],
		marginBottom: Spacing["8"],
	},
	heroTitle: { textAlign: "center" },
	center: { textAlign: "center" },
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: Spacing["6"],
	},
});
