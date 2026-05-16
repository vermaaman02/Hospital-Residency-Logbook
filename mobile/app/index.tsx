/**
 * Root index — redirects to (app) if signed-in, otherwise to (auth)/sign-in.
 * Expo Router handles this via the _layout auth guard, but we need an index
 * to satisfy the router.
 */

import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function Index() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) return null;

	return isSignedIn ? (
		<Redirect href="/(app)" />
	) : (
		<Redirect href="/(auth)/sign-in" />
	);
}
