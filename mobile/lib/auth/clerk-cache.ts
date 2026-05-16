/**
 * Clerk token cache backed by expo-secure-store.
 * Passed to <ClerkProvider tokenCache={clerkTokenCache}>.
 */

import * as SecureStore from "expo-secure-store";
interface TokenCache {
	getToken(key: string): Promise<string | null | undefined>;
	saveToken(key: string, value: string): Promise<void>;
	clearToken?(key: string): Promise<void>;
}

const CLERK_KEY_PREFIX = "__clerk_client_jwt";

export const clerkTokenCache: TokenCache = {
	async getToken(key: string) {
		try {
			return await SecureStore.getItemAsync(`${CLERK_KEY_PREFIX}_${key}`);
		} catch {
			return null;
		}
	},
	async saveToken(key: string, value: string) {
		try {
			await SecureStore.setItemAsync(`${CLERK_KEY_PREFIX}_${key}`, value);
		} catch {
			// ignore
		}
	},
	async clearToken(key: string) {
		try {
			await SecureStore.deleteItemAsync(`${CLERK_KEY_PREFIX}_${key}`);
		} catch {
			// ignore
		}
	},
};
