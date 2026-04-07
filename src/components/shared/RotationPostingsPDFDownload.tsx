/**
 * @component RotationPostingsPDFDownload
 * @description Download rotation postings form as PDF for students.
 * Generates landscape PDF with 20 empty rows for manual fill.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateRotationPostingsPDF } from "@/actions/rotation-postings";

interface RotationPostingsPDFDownloadProps {
	userId: string;
	studentName: string;
	isStudent: boolean;
}

export function RotationPostingsPDFDownload({
	userId,
	studentName,
	isStudent,
}: RotationPostingsPDFDownloadProps) {
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		if (!isStudent) return;

		try {
			setLoading(true);
			const pdfBase64 = await generateRotationPostingsPDF(userId);

			// Create blob from base64
			const binaryString = atob(pdfBase64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes], { type: "application/pdf" });

			// Download
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Rotation_Postings_${studentName}_${new Date().toISOString().split("T")[0]}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("PDF downloaded successfully");
		} catch (error) {
			console.error("Download error:", error);
			toast.error("Failed to download PDF");
		} finally {
			setLoading(false);
		}
	};

	if (!isStudent) {
		return null;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						onClick={handleDownload}
						disabled={loading}
						size="sm"
						variant="outline"
						className="gap-2"
					>
						{loading ?
							<Loader2 className="h-4 w-4 animate-spin" />
						:	<Download className="h-4 w-4" />}
						Download Form
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Download PDF form to fill manually with pen/pencil</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
