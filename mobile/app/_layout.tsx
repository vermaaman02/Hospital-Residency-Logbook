/**
 * Root layout — wraps the entire app with:
 *   1. GestureHandlerRootView (gesture support)
 *   2. ClerkProvider           (auth with built-in SecureStore cache)
 *   3. ClerkLoaded             (wait for Clerk to load)
 *   4. QueryClientProvider     (TanStack Query for data layer)
 *   5. SafeAreaProvider        (safe-area insets)
 *   6. TokenSyncer             (bridges Clerk JWT → axios client)
 *
 * Uses @clerk/expo v3 (Core 3+):
 *   - `@clerk/expo/token-cache` (built-in SecureStore integration)
 *   - `@clerk/expo` plugin in app.json
 *
 * @see https://clerk.com/docs/quickstarts/expo
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setAuthToken } from "@/lib/api/client";

/* ────────────────────────────────────────────────────── */
/*  TanStack Query client                                 */
/* ────────────────────────────────────────────────────── */
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

/* ────────────────────────────────────────────────────── */
/*  Clerk publishable key                                 */
/* ────────────────────────────────────────────────────── */
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!CLERK_KEY) {
	console.error(
		"[auth] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env file!",
	);
}

/* ────────────────────────────────────────────────────── */
/*  TokenSyncer — bridges Clerk JWT into axios client     */
/* ────────────────────────────────────────────────────── */
function TokenSyncer({ children }: { children: React.ReactNode }) {
	const { getToken, isSignedIn, isLoaded } = useAuth();

	useEffect(() => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			setAuthToken(null);
			return;
		}

		let cancelled = false;

		// Fetch a fresh token and inject it into axios
		getToken()
			.then((token) => {
				if (!cancelled) setAuthToken(token ?? null);
			})
			.catch(() => {
				if (!cancelled) setAuthToken(null);
			});

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, getToken]);

	return <>{children}</>;
}

/* ────────────────────────────────────────────────────── */
/*  Root Layout                                           */
/* ────────────────────────────────────────────────────── */
export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
				<ClerkLoaded>
					<QueryClientProvider client={queryClient}>
						<SafeAreaProvider>
							<TokenSyncer>
								<StatusBar style="light" />
								<Stack screenOptions={{ headerShown: false }} />
							</TokenSyncer>
						</SafeAreaProvider>
					</QueryClientProvider>
				</ClerkLoaded>
			</ClerkProvider>
		</GestureHandlerRootView>
	);
}
