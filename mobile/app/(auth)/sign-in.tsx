/**
 * Sign-In screen — OFFICIAL Clerk Expo v3+ (Core 3) custom flow.
 *
 * API shape:
 *   const { signIn, errors, fetchStatus } = useSignIn()
 *
 * Flow:
 *   1. signIn.password({ emailAddress, password })
 *   2. signIn.status === "complete" → signIn.finalize({ navigate })
 *   3. signIn.status === "needs_client_trust" → signIn.mfa.sendEmailCode()
 *   4. Verify → signIn.mfa.verifyEmailCode({ code })
 *
 * @see https://clerk.com/docs/custom-flows/email-password#sign-in-flow
 */

import React from "react";
import {
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSignIn, useAuth } from "@clerk/expo";
import { useRouter, Link, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, Radius, Font } from "@/lib/theme";

export default function SignInScreen() {
	const { signIn, errors, fetchStatus } = useSignIn();
	const { isSignedIn } = useAuth();
	const router = useRouter();

	const [emailAddress, setEmailAddress] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");

	const isLoading = fetchStatus === "fetching";

	// ─── Handle email + password submit ────────────────────
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
					if (session?.currentTask) {
						console.log("Session task:", session.currentTask);
						return;
					}
					const url = decorateUrl("/");
					router.replace(url as Href);
				},
			});
		} else if (signIn.status === "needs_second_factor") {
			// MFA — handled by UI state below
		} else if (signIn.status === "needs_client_trust") {
			// Client Trust — send email verification code
			const emailCodeFactor = signIn.supportedSecondFactors?.find(
				(factor: any) => factor.strategy === "email_code",
			);
			if (emailCodeFactor) {
				await signIn.mfa.sendEmailCode();
			}
		} else {
			console.error("Sign-in attempt not complete:", signIn.status);
		}
	};

	// ─── Handle verification code (MFA / Client Trust) ────
	const handleVerify = async () => {
		await signIn.mfa.verifyEmailCode({ code });

		if (signIn.status === "complete") {
			await signIn.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) {
						console.log("Session task:", session.currentTask);
						return;
					}
					const url = decorateUrl("/");
					router.replace(url as Href);
				},
			});
		} else {
			console.error("Sign-in attempt not complete:", signIn.status);
		}
	};

	// ─── Already signed in ────────────────────────────────
	if (isSignedIn) return null;

	// ─── Client Trust / MFA verification step ─────────────
	if (signIn.status === "needs_client_trust") {
		return (
			<SafeAreaView style={styles.safe}>
				<KeyboardAvoidingView
					style={styles.container}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<View style={styles.card}>
						<View style={styles.iconCircle}>
							<Text style={styles.iconEmoji}>🔐</Text>
						</View>
						<Text style={styles.title}>Verify your account</Text>
						<Text style={styles.subtitle}>
							A verification code has been sent to your email
						</Text>

						<TextInput
							style={styles.input}
							value={code}
							onChangeText={setCode}
							placeholder="Enter verification code"
							placeholderTextColor={Colors.textMuted}
							keyboardType="number-pad"
							autoFocus
						/>

						{errors?.fields?.code && (
							<Text style={styles.errorText}>
								{errors.fields.code.message}
							</Text>
						)}

						<Pressable
							style={({ pressed }) => [
								styles.button,
								(isLoading || !code) && styles.buttonDisabled,
								pressed && styles.buttonPressed,
							]}
							onPress={handleVerify}
							disabled={isLoading || !code}
						>
							<Text style={styles.buttonText}>
								{isLoading ? "Verifying..." : "Verify"}
							</Text>
						</Pressable>

						<Pressable
							style={({ pressed }) => [
								styles.linkButton,
								pressed && { opacity: 0.7 },
							]}
							onPress={() => signIn.mfa.sendEmailCode()}
						>
							<Text style={styles.linkText}>I need a new code</Text>
						</Pressable>

						<Pressable
							style={({ pressed }) => [
								styles.linkButton,
								pressed && { opacity: 0.7 },
							]}
							onPress={() => signIn.reset()}
						>
							<Text style={styles.linkText}>← Start over</Text>
						</Pressable>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	// ─── Main sign-in form ────────────────────────────────
	return (
		<SafeAreaView style={styles.safe}>
			<LinearGradient
				colors={['#0F172A', '#1E293B', '#0F172A']}
				style={StyleSheet.absoluteFillObject}
			/>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.logoContainer}>
							<Image 
								source={require("../../assets/images/aiims-logo.png")} 
								style={styles.logoImage} 
								resizeMode="contain"
							/>
						</View>
					</View>

					{/* Form card */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Sign in</Text>
						<Text style={styles.cardSubtitle}>
							Use your registered email and password
						</Text>

						{/* Email */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Email address</Text>
							<TextInput
								style={styles.input}
								value={emailAddress}
								onChangeText={setEmailAddress}
								placeholder="you@aiims.edu"
								placeholderTextColor={Colors.textMuted}
								autoCapitalize="none"
								keyboardType="email-address"
								autoComplete="email"
								textContentType="emailAddress"
								editable={!isLoading}
							/>
							{errors?.fields?.identifier && (
								<Text style={styles.errorText}>
									{errors.fields.identifier.message}
								</Text>
							)}
						</View>

						{/* Password */}
						<View style={styles.fieldGroup}>
							<Text style={styles.label}>Password</Text>
							<TextInput
								style={styles.input}
								value={password}
								onChangeText={setPassword}
								placeholder="••••••••"
								placeholderTextColor={Colors.textMuted}
								secureTextEntry
								autoComplete="password"
								textContentType="password"
								editable={!isLoading}
								onSubmitEditing={handleSubmit}
								returnKeyType="go"
							/>
							{errors?.fields?.password && (
								<Text style={styles.errorText}>
									{errors.fields.password.message}
								</Text>
							)}
						</View>

						{/* Submit */}
						<Pressable
							style={({ pressed }) => [
								styles.button,
								(!emailAddress || !password || isLoading) &&
									styles.buttonDisabled,
								pressed && styles.buttonPressed,
							]}
							onPress={handleSubmit}
							disabled={!emailAddress || !password || isLoading}
						>
							<Text style={styles.buttonText}>
								{isLoading ? "Signing in..." : "Continue"}
							</Text>
						</Pressable>

						{/* Sign up link */}
						<View style={styles.footer}>
							<Text style={styles.footerText}>
								Don't have an account?{" "}
							</Text>
							<Link href="/(auth)/sign-up">
								<Text style={styles.linkText}>Sign up</Text>
							</Link>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

/* ────────────────────────────────────────────────────── */
/*  Styles                                                */
/* ────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: Colors.bg,
	},
	container: {
		flex: 1,
		justifyContent: "center",
		padding: Spacing.xl,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		padding: Spacing.xl,
	},
	header: {
		alignItems: "center",
		marginBottom: Spacing.xxxl,
	},
	logoContainer: {
		width: '100%',
		maxWidth: 280,
		height: 100,
		backgroundColor: "#FFFFFF",
		borderRadius: Radius.xl,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.md,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 10,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.1)",
	},
	logoImage: {
		width: "100%",
		height: "100%",
	},
	card: {
		backgroundColor: Colors.bgCard,
		borderRadius: Radius.lg,
		padding: Spacing.xxl,
		gap: Spacing.lg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	cardTitle: {
		fontSize: Font.size.xl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
	},
	cardSubtitle: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		marginTop: -Spacing.sm,
	},
	subtitle: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		textAlign: "center",
		lineHeight: 20,
	},
	fieldGroup: { gap: Spacing.sm },
	label: {
		fontSize: Font.size.sm,
		fontWeight: Font.weight.semibold,
		color: Colors.textSecondary,
	},
	input: {
		backgroundColor: Colors.bgInput,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.lg,
		paddingVertical: 14,
		color: Colors.textPrimary,
		fontSize: Font.size.md,
		borderWidth: 1,
		borderColor: Colors.borderSubtle,
	},
	button: {
		backgroundColor: Colors.primary,
		borderRadius: Radius.sm,
		paddingVertical: 15,
		alignItems: "center",
		marginTop: Spacing.sm,
	},
	buttonDisabled: { opacity: 0.5 },
	buttonPressed: { opacity: 0.85 },
	buttonText: {
		color: "#fff",
		fontWeight: Font.weight.semibold,
		fontSize: Font.size.md,
	},
	errorText: {
		color: Colors.error,
		fontSize: Font.size.xs,
		marginTop: 2,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: Spacing.sm,
	},
	footerText: { color: Colors.textSecondary, fontSize: Font.size.sm },
	linkButton: {
		alignItems: "center",
		paddingVertical: Spacing.sm,
	},
	linkText: {
		color: Colors.primaryLight,
		fontWeight: Font.weight.semibold,
		fontSize: Font.size.sm,
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: Colors.bgSurface,
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "center",
	},
	iconEmoji: { fontSize: 24 },
	title: {
		fontSize: Font.size.xl,
		fontWeight: Font.weight.bold,
		color: Colors.textPrimary,
		textAlign: "center",
	},
});
