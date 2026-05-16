/**
 * Root layout — wraps the entire app with:
 *   - ClerkProvider (auth)
 *   - QueryClientProvider (data fetching)
 *   - Persistent query cache via AsyncStorage
 *
 * Expo Router handles navigation; this file sets up providers only.
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { clerkTokenCache } from "@/lib/auth/clerk-cache";
import { setAuthToken } from "@/lib/api/client";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 2,
			refetchOnWindowFocus: false,
		},
	},
});

const asyncStoragePersister = createAsyncStoragePersister({
	storage: AsyncStorage,
	key: "logbook-query-cache",
});

const extra = Constants.expoConfig?.extra as {
	clerkPublishableKey?: string;
} | undefined;

const CLERK_KEY =
	extra?.clerkPublishableKey ?? process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/**
 * Inner component that syncs the Clerk JWT into the axios client.
 * Must be inside ClerkProvider.
 */
function TokenSyncer({ children }: { children: React.ReactNode }) {
	const { getToken, isSignedIn } = useAuth();

	useEffect(() => {
		if (!isSignedIn) {
			setAuthToken(null);
			return;
		}
		getToken().then((token) => {
			setAuthToken(token ?? null);
		});
	}, [isSignedIn, getToken]);

	return <>{children}</>;
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ClerkProvider publishableKey={CLERK_KEY} tokenCache={clerkTokenCache}>
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{ persister: asyncStoragePersister }}
					onSuccess={() => SplashScreen.hideAsync()}
				>
					<TokenSyncer>
						<Stack screenOptions={{ headerShown: false }} />
					</TokenSyncer>
				</PersistQueryClientProvider>
			</ClerkProvider>
		</GestureHandlerRootView>
	);
}
