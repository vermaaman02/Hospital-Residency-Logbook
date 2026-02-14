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
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "100vh",
						fontFamily: "Inter, system-ui, sans-serif",
						gap: "1rem",
						padding: "2rem",
						textAlign: "center",
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#dc2626"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
					<h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
						Something went wrong
					</h1>
					<p style={{ color: "#6b7280", maxWidth: "400px" }}>
						A critical error occurred. Please try refreshing the page or contact
						support if the problem persists.
					</p>
					<button
						onClick={reset}
						style={{
							padding: "0.5rem 1.5rem",
							border: "1px solid #e5e7eb",
							borderRadius: "0.375rem",
							cursor: "pointer",
							fontSize: "0.875rem",
							fontWeight: 500,
							background: "white",
						}}
					>
						Try Again
					</button>
				</div>
			</body>
		</html>
	);
}
