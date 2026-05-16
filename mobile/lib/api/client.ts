/**
 * Axios instance for all /api/v1/* REST calls.
 * The Authorization header is injected by setAuthToken() which is called
 * from the root layout after Clerk provides a fresh session token.
 */

import axios from "axios";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as {
	apiBaseUrl?: string;
} | undefined;

const BASE_URL = extra?.apiBaseUrl ?? "http://localhost:3000";

export const apiClient = axios.create({
	baseURL: BASE_URL,
	timeout: 15_000,
	headers: {
		"Content-Type": "application/json",
	},
});

/**
 * Call this once after sign-in / token refresh to attach the Clerk JWT.
 * Passing null clears the header (on sign-out).
 */
export function setAuthToken(token: string | null) {
	if (token) {
		apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
	} else {
		delete apiClient.defaults.headers.common["Authorization"];
	}
}

export type V1Response<T> = {
	ok: true;
	data: T;
} | {
	ok: false;
	error: string;
};
