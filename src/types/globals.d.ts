/**
 * @module Global Type Declarations
 * @description Extends Clerk's session claims with our custom role metadata.
 * This enables TypeScript autocomplete for session claims across the app.
 *
 * @see copilot-instructions.md — Section 8
 * @see Clerk RBAC guide: https://clerk.com/docs/guides/basic-rbac
 */

export {};

export type Roles = "hod" | "faculty" | "student";

declare global {
	interface CustomJwtSessionClaims {
		metadata: {
			role?: Roles;
		};
	}
}
