/**
 * Auth route group layout.
 * If user is already signed in → redirect to app.
 * Otherwise render the auth stack (sign-in, sign-up).
 */

import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { Colors } from "@/lib/theme";

export default function AuthLayout() {
	const { isSignedIn, isLoaded } = useAuth();

	// Wait for Clerk to load before deciding
	if (!isLoaded) return null;

	// Already signed in → skip auth
	if (isSignedIn) {
		return <Redirect href="/(app)" />;
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: Colors.bg },
				animation: "slide_from_right",
			}}
		/>
	);
}
