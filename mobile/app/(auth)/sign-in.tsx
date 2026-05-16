/**
 * Sign-in screen.
 * Uses Clerk's useSignIn hook for email + password auth.
 * On success, Expo Router redirects to (app)/_layout which will boot the session.
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
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SignInScreen() {
	const { signIn, setActive, isLoaded } = useSignIn();
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSignIn() {
		if (!isLoaded) return;
		setLoading(true);
		try {
			const result = await signIn.create({
				identifier: email.trim().toLowerCase(),
				password,
			});

			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
				router.replace("/(app)");
			} else {
				Alert.alert("Sign-in incomplete", "Please check your credentials.");
			}
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "An unexpected error occurred";
			Alert.alert("Sign-in failed", msg);
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
				<Text style={styles.title}>AIIMS Patna Logbook</Text>
				<Text style={styles.subtitle}>Resident Sign-in</Text>

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
					onPress={handleSignIn}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Sign in</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
					<Text style={styles.link}>Don't have an account? Sign up</Text>
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
		gap: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: "700",
		color: "#f1f5f9",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		color: "#94a3b8",
		textAlign: "center",
		marginBottom: 8,
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
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 15,
	},
	link: {
		color: "#60a5fa",
		textAlign: "center",
		marginTop: 4,
		fontSize: 13,
	},
});
