/**
 * Auth route group layout.
 *   Already signed in → redirect to (app)
 *   Otherwise        → render auth stack (sign-in / sign-up)
 */

import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Colors } from "@/lib/theme";

export default function AuthLayout() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) return null;
	if (isSignedIn) return <Redirect href="/(app)" />;

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: Colors.background },
				animation: "slide_from_right",
			}}
		/>
	);
}
