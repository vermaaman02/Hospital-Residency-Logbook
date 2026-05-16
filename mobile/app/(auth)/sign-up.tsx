/**
 * Sign-up screen.
 * Uses Clerk's useSignUp hook. After email verification the user lands on sign-in.
 * Note: Student accounts are provisioned by HOD/admin via the web app.
 * This screen is for first-time Clerk account setup only.
 */

import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Alert,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SignUpScreen() {
	const { signUp, setActive, isLoaded } = useSignUp();
	const router = useRouter();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [pendingVerification, setPendingVerification] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSignUp() {
		if (!isLoaded) return;
		setLoading(true);
		try {
			await signUp.create({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				emailAddress: email.trim().toLowerCase(),
				password,
			});
			await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
			setPendingVerification(true);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Sign-up failed";
			Alert.alert("Error", msg);
		} finally {
			setLoading(false);
		}
	}

	async function handleVerify() {
		if (!isLoaded) return;
		setLoading(true);
		try {
			const result = await signUp.attemptEmailAddressVerification({ code });
			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
				router.replace("/(app)");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Verification failed";
			Alert.alert("Error", msg);
		} finally {
			setLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View style={styles.card}>
				<Text style={styles.title}>Create Account</Text>

				{!pendingVerification ? (
					<>
						<TextInput
							style={styles.input}
							placeholder="First name"
							placeholderTextColor="#94a3b8"
							value={firstName}
							onChangeText={setFirstName}
						/>
						<TextInput
							style={styles.input}
							placeholder="Last name"
							placeholderTextColor="#94a3b8"
							value={lastName}
							onChangeText={setLastName}
						/>
						<TextInput
							style={styles.input}
							placeholder="Email"
							placeholderTextColor="#94a3b8"
							autoCapitalize="none"
							keyboardType="email-address"
							value={email}
							onChangeText={setEmail}
						/>
						<TextInput
							style={styles.input}
							placeholder="Password"
							placeholderTextColor="#94a3b8"
							secureTextEntry
							value={password}
							onChangeText={setPassword}
						/>
						<TouchableOpacity
							style={[styles.button, loading && styles.buttonDisabled]}
							onPress={handleSignUp}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.buttonText}>Continue</Text>
							)}
						</TouchableOpacity>
					</>
				) : (
					<>
						<Text style={styles.subtitle}>
							Enter the 6-digit code sent to {email}
						</Text>
						<TextInput
							style={styles.input}
							placeholder="Verification code"
							placeholderTextColor="#94a3b8"
							keyboardType="number-pad"
							value={code}
							onChangeText={setCode}
						/>
						<TouchableOpacity
							style={[styles.button, loading && styles.buttonDisabled]}
							onPress={handleVerify}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.buttonText}>Verify email</Text>
							)}
						</TouchableOpacity>
					</>
				)}

				<TouchableOpacity onPress={() => router.back()}>
					<Text style={styles.link}>Already have an account? Sign in</Text>
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		padding: 24,
	},
	card: {
		backgroundColor: "#1e293b",
		borderRadius: 16,
		padding: 28,
		gap: 14,
	},
	title: {
		fontSize: 22,
		fontWeight: "700",
		color: "#f1f5f9",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 13,
		color: "#94a3b8",
		textAlign: "center",
	},
	input: {
		backgroundColor: "#0f172a",
		borderRadius: 10,
		padding: 14,
		color: "#f1f5f9",
		fontSize: 15,
		borderWidth: 1,
		borderColor: "#334155",
	},
	button: {
		backgroundColor: "#3b82f6",
		borderRadius: 10,
		padding: 15,
		alignItems: "center",
		marginTop: 4,
	},
	buttonDisabled: { opacity: 0.6 },
	buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
	link: {
		color: "#60a5fa",
		textAlign: "center",
		fontSize: 13,
	},
});
