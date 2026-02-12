/**
 * @module SignInPage
 * @description Clerk sign-in page with AIIMS Patna branding.
 */

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-hospital-background">
			<div className="flex flex-col items-center gap-6">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold text-hospital-text-primary">
						PG Residency Digital Logbook
					</h1>
					<p className="text-sm text-hospital-text-secondary">
						AIIMS Patna — Department of Emergency Medicine
					</p>
				</div>
				<SignIn
					appearance={{
						elements: {
							rootBox: "mx-auto",
							card: "shadow-lg",
						},
					}}
				/>
			</div>
		</div>
	);
}
