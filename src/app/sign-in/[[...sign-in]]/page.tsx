/**
 * @module SignInPage
 * @description Clerk sign-in page with AIIMS Patna branding.
 */

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

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
				<div className="w-full max-w-sm rounded-lg border border-hospital-border bg-hospital-surface/60 px-4 py-3">
					<div className="flex items-start gap-2">
						<ShieldAlert className="mt-0.5 h-4 w-4 text-hospital-accent" />
						<div className="space-y-1">
							<p className="text-xs font-semibold text-hospital-text-primary">
								Account banned?
							</p>
							<p className="text-xs text-hospital-text-secondary">
								Check your ban status and reason here:
							</p>
							<Link
								href="/banned"
								className="text-xs text-hospital-primary hover:text-hospital-primary-dark transition-colors"
							>
								/banned
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
