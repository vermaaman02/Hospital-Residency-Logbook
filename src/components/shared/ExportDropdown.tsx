/**
 * @module ExportDropdown
 * @description Reusable dropdown button for exporting data in PDF or Excel format.
 * Shows a loading spinner while the export is being generated.
 *
 * @see roadmap.md — Section 6, Reusable Components
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportDropdownProps {
	onExportPdf: () => Promise<void>;
	onExportExcel: () => void | Promise<void>;
	label?: string;
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
}

export function ExportDropdown({
	onExportPdf,
	onExportExcel,
	label = "Download",
	variant = "outline",
	size = "sm",
}: ExportDropdownProps) {
	const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

	async function handlePdf() {
		setLoading("pdf");
		try {
			await onExportPdf();
			toast.success("PDF downloaded successfully");
		} catch (err) {
			console.error("[EXPORT_PDF]", err);
			toast.error("Failed to generate PDF");
		} finally {
			setLoading(null);
		}
	}

	async function handleExcel() {
		setLoading("excel");
		try {
			await onExportExcel();
			toast.success("Excel downloaded successfully");
		} catch (err) {
			console.error("[EXPORT_EXCEL]", err);
			toast.error("Failed to generate Excel");
		} finally {
			setLoading(null);
		}
	}

	const isLoading = loading !== null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant={variant} size={size} disabled={isLoading}>
					{isLoading ?
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
					:	<Download className="h-4 w-4 mr-2" />}
					{isLoading ?
						loading === "pdf" ?
							"Generating PDF..."
						:	"Generating Excel..."
					:	label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handlePdf} disabled={isLoading}>
					<FileText className="h-4 w-4 mr-2" />
					Download as PDF
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleExcel} disabled={isLoading}>
					<FileSpreadsheet className="h-4 w-4 mr-2" />
					Download as Excel
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
