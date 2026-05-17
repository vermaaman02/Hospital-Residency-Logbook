/**
 * Sign-Up screen — OFFICIAL Clerk Expo v3+ (Core 3) custom flow.
 *
 * API shape:
 *   const { signUp, errors, fetchStatus } = useSignUp()
 *
 * Flow:
 *   1. signUp.password({ emailAddress, password })
 *   2. signUp.verifications.sendEmailCode()
 *   3. signUp.verifications.verifyEmailCode({ code })
 *   4. signUp.status === "complete" → signUp.finalize({ navigate })
 *
 * @see https://clerk.com/docs/custom-flows/email-password#sign-up-flow
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
import { useSignUp, useAuth } from "@clerk/expo";
import { useRouter, Link, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, Radius, Font } from "@/lib/theme";

export default function SignUpScreen() {
	const { signUp, errors, fetchStatus } = useSignUp();
	const { isSignedIn } = useAuth();
	const router = useRouter();

	const [emailAddress, setEmailAddress] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");

	const isLoading = fetchStatus === "fetching";

	// ─── Handle sign-up submit ────────────────────────────
	const handleSubmit = async () => {
		const { error } = await signUp.password({
			emailAddress: emailAddress.trim().toLowerCase(),
			password,
		});

		if (error) {
			console.error("Sign-up error:", JSON.stringify(error, null, 2));
			return;
		}

		// No error — trigger email verification
		await signUp.verifications.sendEmailCode();
	};

	// ─── Handle email verification ────────────────────────
	const handleVerify = async () => {
		await signUp.verifications.verifyEmailCode({ code });

		if (signUp.status === "complete") {
			await signUp.finalize({
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
			console.error("Sign-up attempt not complete:", signUp.status);
		}
	};

	// ─── Already signed in ────────────────────────────────
	if (signUp.status === "complete" || isSignedIn) return null;

	// ─── Email verification step ──────────────────────────
	if (
		signUp.status === "missing_requirements" &&
		signUp.unverifiedFields?.includes("email_address") &&
		signUp.missingFields?.length === 0
	) {
		return (
			<SafeAreaView style={styles.safe}>
			<LinearGradient
				colors={['#0F172A', '#1E293B', '#0F172A']}
				style={StyleSheet.absoluteFillObject}
			/>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<View style={styles.card}>
						<View style={styles.iconCircle}>
							<Text style={styles.iconEmoji}>✉️</Text>
						</View>
						<Text style={styles.title}>Verify your email</Text>
						<Text style={styles.subtitle}>
							We sent a verification code to{"\n"}
							<Text style={styles.emailHighlight}>{emailAddress}</Text>
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
								{isLoading ? "Verifying..." : "Verify email"}
							</Text>
						</Pressable>

						<Pressable
							style={({ pressed }) => [
								styles.linkButton,
								pressed && { opacity: 0.7 },
							]}
							onPress={() => signUp.verifications.sendEmailCode()}
						>
							<Text style={styles.linkText}>I need a new code</Text>
						</Pressable>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	// ─── Main sign-up form ────────────────────────────────
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
						<Text style={styles.cardTitle}>Sign up</Text>

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
							{errors?.fields?.emailAddress && (
								<Text style={styles.errorText}>
									{errors.fields.emailAddress.message}
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
								placeholder="Min. 8 characters"
								placeholderTextColor={Colors.textMuted}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								editable={!isLoading}
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
								{isLoading ? "Creating account..." : "Create account"}
							</Text>
						</Pressable>

						{/* Sign in link */}
						<View style={styles.footer}>
							<Text style={styles.footerText}>
								Already have an account?{" "}
							</Text>
							<Link href="/(auth)/sign-in">
								<Text style={styles.linkText}>Sign in</Text>
							</Link>
						</View>
					</View>

					{/* Clerk bot protection */}
					<View nativeID="clerk-captcha" />
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
	subtitle: {
		fontSize: Font.size.sm,
		color: Colors.textSecondary,
		textAlign: "center",
		lineHeight: 20,
	},
	emailHighlight: {
		color: Colors.primaryLight,
		fontWeight: Font.weight.semibold,
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
