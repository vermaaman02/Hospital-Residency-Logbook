/**
 * @module GlobalError
 * @description Global error boundary for the entire app.
 * Catches errors that occur outside of the dashboard layout.
 *
 * @see copilot-instructions.md — Section 14
 */

"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[GLOBAL_ERROR]", error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 text-center font-sans space-y-6">
					<div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
						</svg>
					</div>
					
					<div className="space-y-2 max-w-md w-full">
						<h1 className="text-2xl font-bold text-slate-900">
							Oops! Something went wrong
						</h1>
						<p className="text-slate-600">
							An unexpected error occurred. Please try refreshing or contact support if the problem persists.
						</p>
					</div>

					<div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg w-full max-w-lg text-left overflow-auto">
						<p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Error Details:</p>
						<p className="font-mono text-sm break-words">{error.message || "Unknown Application Error"}</p>
					</div>

					<button
						onClick={reset}
						className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors"
					>
						Try Again
					</button>
				</div>
			</body>
		</html>
	);
}
