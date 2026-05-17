/**
 * Sign-Up screen — Clerk Expo v3 (Core 3) custom flow.
 *
 *   1. signUp.create({ emailAddress, password, firstName, lastName })
 *   2. signUp.prepareEmailAddressVerification({ strategy: "email_code" })
 *   3. signUp.attemptEmailAddressVerification({ code })
 *   4. signUp.finalize({ navigate })
 *
 * Note: this creates the Clerk identity only. The DB `User` row is
 * provisioned later by an HOD/admin (see Mobile-app-roadmap §6).
 */

import React, { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link, type Href } from "expo-router";
import { useSignUp, useAuth } from "@clerk/expo";
import { HeartPulse, ArrowRight, ShieldCheck } from "lucide-react-native";

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

export default function SignUpScreen() {
	const { signUp: rawSignUp, errors: rawErrors, fetchStatus } = useSignUp();
	const signUp = rawSignUp as any;
	const errors = rawErrors as any;
	const { isSignedIn } = useAuth();
	const router = useRouter();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [emailAddress, setEmailAddress] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");

	const isLoading = fetchStatus === "fetching";

	const handleCreate = async () => {
		const { error } = await signUp.create({
			emailAddress: emailAddress.trim().toLowerCase(),
			password,
			firstName: firstName.trim(),
			lastName: lastName.trim(),
		});
		if (error) {
			console.error("Sign-up error:", JSON.stringify(error, null, 2));
			return;
		}
		await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
	};

	const handleVerify = async () => {
		await signUp.attemptEmailAddressVerification({ code });
		if (signUp.status === "complete") {
			await signUp.finalize({
				navigate: ({ session, decorateUrl }: { session: any; decorateUrl: (u: string) => string }) => {
					if (session?.currentTask) return;
					router.replace(decorateUrl("/") as Href);
				},
			});
		}
	};

	if (isSignedIn) return null;

	const needsVerify = signUp.status === "missing_requirements" &&
		signUp.unverifiedFields?.includes("email_address");

	if (needsVerify) {
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
						<Heading level={1} style={styles.heroTitle}>Verify your email</Heading>
						<Text variant="muted" style={styles.center}>
							We sent a 6-digit code to{" "}
							<Text variant="bodyStrong" color={Colors.foreground}>
								{emailAddress}
							</Text>
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
								label={isLoading ? "Verifying…" : "Verify & continue"}
								onPress={handleVerify}
								loading={isLoading}
								disabled={!code}
								fullWidth
							/>
						</VStack>
					</Card>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
			<DotGrid />
			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="always"
				showsVerticalScrollIndicator={false}
			>
				<Confetti count={8} seed={23} opacity={0.6} />

				<View style={styles.hero}>
					<IconBubble
						icon={<HeartPulse color={Colors.inverse} size={28} strokeWidth={2.5} />}
						tone="pink"
						size={68}
					/>
					<Heading level={1} style={styles.heroTitle}>Create your account</Heading>
					<Squiggle color={Colors.amber} width={80} height={10} waves={3} />
					<Text variant="muted" style={styles.center}>
						Join the AIIMS Patna resident logbook
					</Text>
				</View>

				<Card>
					<VStack gap="4">
						<View style={styles.row}>
							<View style={styles.half}>
								<Input
									label="First name"
									value={firstName}
									onChangeText={setFirstName}
									placeholder="Anika"
									autoCapitalize="words"
									error={errors?.fields?.firstName?.message}
								/>
							</View>
							<View style={styles.half}>
								<Input
									label="Last name"
									value={lastName}
									onChangeText={setLastName}
									placeholder="Sharma"
									autoCapitalize="words"
									error={errors?.fields?.lastName?.message}
								/>
							</View>
						</View>

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
							placeholder="At least 8 characters"
							secureTextEntry
							autoComplete="new-password"
							error={errors?.fields?.password?.message ?? errors?.global?.[0]?.message}
						/>

						<Button
							label={isLoading ? "Creating…" : "Create account"}
							onPress={handleCreate}
							loading={isLoading}
							disabled={!emailAddress || !password || !firstName}
							fullWidth
							rightIcon={<ArrowRight color={Colors.inverse} size={18} strokeWidth={2.5} />}
						/>
					</VStack>
				</Card>

				<View style={styles.footer}>
					<Text variant="muted">Already a resident? </Text>
					<Link href="/(auth)/sign-in" asChild>
						<Text variant="bodyStrong" color={Colors.accent}>Sign in</Text>
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
		marginBottom: Spacing["6"],
	},
	heroTitle: { textAlign: "center" },
	center: { textAlign: "center" },
	row: { flexDirection: "row", gap: Spacing["3"] },
	half: { flex: 1 },
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: Spacing["6"],
	},
});
