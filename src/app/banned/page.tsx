/**
 * @module BannedPage
 * @description Public page where banned users can look up their ban reason
 * and expected unban date. No authentication required.
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBanStatus } from "@/actions/user-management";
import {
	ShieldAlert,
	Search,
	Loader2,
	Clock,
	AlertTriangle,
	CheckCircle2,
	ArrowLeft,
	Ban,
	MessageSquare,
} from "lucide-react";
import Link from "next/link";

type BanResult = Awaited<ReturnType<typeof getBanStatus>>;

export default function BannedPage() {
	const [email, setEmail] = useState("");
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<BanResult | null>(null);

	function handleLookup(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;

		startTransition(async () => {
			const data = await getBanStatus(email.trim().toLowerCase());
			setResult(data);
		});
	}

	return (
		<div className="min-h-screen bg-hospital-background flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="flex justify-center">
						<div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
							<ShieldAlert className="h-8 w-8 text-red-600" />
						</div>
					</div>
					<h1 className="text-2xl font-bold text-hospital-text-primary">
						Account Status Check
					</h1>
					<p className="text-sm text-hospital-text-secondary">
						Enter your email to check your account and ban status
					</p>
				</div>

				{/* Lookup Form */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Check Your Status</CardTitle>
						<CardDescription>
							If you&apos;ve been banned, you can see the reason and expected
							unban date here.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleLookup} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email Address</Label>
								<Input
									id="email"
									type="email"
									placeholder="your.email@aiims.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={isPending}
								/>
							</div>
							<Button
								type="submit"
								className="w-full gap-2"
								disabled={isPending || !email.trim()}
							>
								{isPending ?
									<Loader2 className="h-4 w-4 animate-spin" />
								:	<Search className="h-4 w-4" />}
								Check Status
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Result */}
				{result && (
					<Card
						className={
							result.found && "isBanned" in result && result.isBanned ?
								"border-red-200 bg-red-50/50"
							: result.found ?
								"border-green-200 bg-green-50/50"
							:	"border-amber-200 bg-amber-50/50"
						}
					>
						<CardContent className="pt-6">
							{!result.found ?
								<div className="flex items-start gap-3">
									<AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
									<div>
										<p className="font-medium text-amber-800">
											{result.message}
										</p>
										<p className="text-sm text-amber-600 mt-1">
											Please check the email address and try again.
										</p>
									</div>
								</div>
							: "isBanned" in result && result.isBanned ?
								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<Ban className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
										<div>
											<p className="font-medium text-red-800">
												Your account has been banned
											</p>
											<p className="text-sm text-red-600 mt-0.5">
												{result.firstName} {result.lastName}
											</p>
										</div>
									</div>

									{/* Ban type */}
									<div className="flex items-center gap-2">
										<Badge
											variant="outline"
											className={
												result.status === "TEMPORARILY_BANNED" ?
													"bg-amber-100 text-amber-800 border-amber-200"
												:	"bg-red-100 text-red-800 border-red-200"
											}
										>
											{result.status === "TEMPORARILY_BANNED" ?
												"Temporary Ban"
											:	"Permanent Ban"}
										</Badge>
									</div>

									{/* Ban reason */}
									{result.banReason && (
										<div className="bg-white/80 rounded-lg p-3 border border-red-200">
											<div className="flex items-start gap-2">
												<MessageSquare className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
												<div>
													<p className="text-xs font-medium text-red-700 mb-1">
														Ban Reason
													</p>
													<p className="text-sm text-red-800">
														{result.banReason}
													</p>
												</div>
											</div>
										</div>
									)}

									{/* Unban date */}
									{result.bannedUntil && (
										<div className="bg-white/80 rounded-lg p-3 border border-amber-200">
											<div className="flex items-start gap-2">
												<Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
												<div>
													<p className="text-xs font-medium text-amber-700 mb-1">
														Expected Unban Date
													</p>
													<p className="text-sm font-medium text-amber-800">
														{new Date(result.bannedUntil).toLocaleDateString(
															"en-IN",
															{
																year: "numeric",
																month: "long",
																day: "numeric",
															},
														)}
													</p>
													<p className="text-xs text-amber-600 mt-1">
														Your account will be automatically reactivated on
														this date.
													</p>
												</div>
											</div>
										</div>
									)}

									{!result.bannedUntil && result.status === "BANNED" && (
										<p className="text-sm text-red-600">
											This is a permanent ban. Please contact the Head of
											Department to resolve this.
										</p>
									)}
								</div>
							:	<div className="flex items-start gap-3">
									<CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
									<div>
										<p className="font-medium text-green-800">
											Your account is active
										</p>
										<p className="text-sm text-green-600 mt-0.5">
											{"firstName" in result &&
												`${result.firstName} ${result.lastName} — `}
											No restrictions on your account.
										</p>
									</div>
								</div>
							}
						</CardContent>
					</Card>
				)}

				{/* Back to sign in */}
				<div className="text-center">
					<Link
						href="/sign-in"
						className="inline-flex items-center gap-2 text-sm text-hospital-text-secondary hover:text-hospital-primary transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Sign In
					</Link>
				</div>
			</div>
		</div>
	);
}
