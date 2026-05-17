/**
 * Root index — redirects based on auth state.
 * Signed in  → (app) tabs
 * Signed out → (auth) sign-in
 */

import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/lib/theme";

export default function Index() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={Colors.primary} />
			</View>
		);
	}

	return <Redirect href={isSignedIn ? "/(app)" : "/(auth)/sign-in"} />;
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		backgroundColor: Colors.bg,
		justifyContent: "center",
		alignItems: "center",
	},
});
