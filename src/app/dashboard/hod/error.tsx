/**
 * @module HODError
 * @description Error boundary for HOD dashboard pages.
 */

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function HODError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[HOD_ERROR]", error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
			<AlertTriangle className="h-12 w-12 text-destructive" />
			<h2 className="text-xl font-semibold">Something went wrong</h2>
			<p className="text-muted-foreground text-center max-w-md">
				An error occurred while loading the page. Please try again.
			</p>
			<Button onClick={reset} variant="outline">
				Try Again
			</Button>
		</div>
	);
}
