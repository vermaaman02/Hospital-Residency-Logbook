/**
 * Root index — redirects based on auth state.
 *   Signed in  → (app) tabs
 *   Signed out → (auth) sign-in
 */

import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Colors } from "@/lib/theme";

export default function Index() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: Colors.background,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<ActivityIndicator size="large" color={Colors.accent} />
			</View>
		);
	}

	return <Redirect href={isSignedIn ? "/(app)" : "/(auth)/sign-in"} />;
}
