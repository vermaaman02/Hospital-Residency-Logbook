/**
 * Auth route group layout.
 * Redirects to (app) if the user is already signed in.
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function AuthLayout() {
	const { isSignedIn, isLoaded } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			router.replace("/(app)");
		}
	}, [isLoaded, isSignedIn, router]);

	return (
		<Stack screenOptions={{ headerShown: false }} />
	);
}
