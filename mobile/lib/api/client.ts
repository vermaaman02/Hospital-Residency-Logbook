/**
 * Axios client for all /api/v1/* REST calls.
 * Authorization header is injected by TokenSyncer in the root layout
 * after Clerk provides a fresh session JWT.
 */

import axios from "axios";

const BASE_URL =
	process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const apiClient = axios.create({
	baseURL: BASE_URL,
	timeout: 15_000,
	headers: { "Content-Type": "application/json" },
});

/**
 * Called from root layout on every auth state change.
 * Sets or clears the Bearer token for all subsequent API calls.
 */
export function setAuthToken(token: string | null) {
	if (token) {
		apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
	} else {
		delete apiClient.defaults.headers.common["Authorization"];
	}
}
