/**
 * @component RotationPostingAttachments
 * @description Upload/view attachments for rotation posting rows.
 * Students can upload, all roles can download.
 * Uses secure signed upload (same method as ECG/ABG).
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { FileUp, X, Download } from "lucide-react";
import { toast } from "sonner";
import {
	addRotationPostingAttachment,
	removeRotationPostingAttachment,
} from "@/actions/rotation-postings";
import { getCloudinarySignature } from "@/actions/cloudinary";

interface RotationPostingAttachmentsProps {
	postingId: string;
	attachments: string[];
	isStudent: boolean;
	isPending?: boolean;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

export function RotationPostingAttachments({
	postingId,
	attachments,
	isStudent,
	isPending = false,
}: RotationPostingAttachmentsProps) {
	const [open, setOpen] = useState(false);
	const [uploading, setUploading] = useState(false);

	const handleUpload = useCallback(
		async (file: File) => {
			if (!isStudent) return;

			try {
				setUploading(true);

				// Use secure signed upload method (same as ECG/ABG)
				const { timestamp, signature } = await getCloudinarySignature();

				const formData = new FormData();
				formData.append("file", file);
				formData.append("api_key", API_KEY || "");
				formData.append("timestamp", timestamp.toString());
				formData.append("signature", signature);

				const response = await fetch(
					`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
					{
						method: "POST",
						body: formData,
					},
				);

				if (!response.ok) {
					const errorData = await response.json();
					console.error("Cloudinary error:", errorData);
					throw new Error(errorData.error?.message || "Upload failed");
				}

				const data = await response.json();
				const cloudinaryUrl = data.secure_url;

				// Save to database
				const result = await addRotationPostingAttachment(
					postingId,
					cloudinaryUrl,
				);

				if (result.success) {
					toast.success("Attachment uploaded successfully");
					setOpen(false);
				} else {
					toast.error("Failed to save attachment");
				}
			} catch (error) {
				console.error("Upload error:", error);
				toast.error(
					error instanceof Error ?
						error.message
					:	"Failed to upload attachment",
				);
			} finally {
				setUploading(false);
			}
		},
		[postingId, isStudent],
	);

	const handleRemove = useCallback(
		async (url: string) => {
			if (!isStudent) return;

			try {
				const result = await removeRotationPostingAttachment(postingId, url);
				if (result.success) {
					toast.success("Attachment removed");
				}
			} catch (error) {
				console.error("Remove error:", error);
				toast.error("Failed to remove attachment");
			}
		},
		[postingId, isStudent],
	);

	// Extract filename from URL, removing query params and hashes
	const getFilename = (url: string): string => {
		try {
			const urlPath = url.split("?")[0].split("#")[0]; // Remove query params
			const parts = urlPath.split("/");
			const filename = parts[parts.length - 1];
			// Decode and limit length
			return decodeURIComponent(filename).substring(0, 40);
		} catch {
			return "Attachment";
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="relative h-8 w-8 p-0"
					disabled={isPending || uploading}
				>
					<FileUp className="h-4 w-4" />
					{attachments.length > 0 && (
						<span className="absolute -top-1 -right-1 bg-hospital-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
							{attachments.length}
						</span>
					)}
				</Button>
			</DialogTrigger>

			<DialogContent className="w-full max-w-sm sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Attachments</DialogTitle>
					<DialogDescription>
						{isStudent ?
							"Upload or remove attachments for this rotation posting"
						:	"View attachments"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Upload section for students */}
					{isStudent && (
						<div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/30 transition-colors">
							<label className="cursor-pointer block">
								<input
									type="file"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleUpload(file);
									}}
									disabled={uploading}
									className="hidden"
									accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
								/>
								<div className="flex flex-col items-center gap-2">
									<FileUp className="h-6 w-6 text-muted-foreground" />
									<span className="text-sm font-medium">
										{uploading ? "Uploading..." : "Click to upload or drag"}
									</span>
									<span className="text-xs text-muted-foreground">
										PDF, DOC, DOCX, JPG, PNG, XLSX
									</span>
								</div>
							</label>
						</div>
					)}

					{/* Attachments list */}
					<div className="space-y-2 pr-2">
						{attachments.length === 0 ?
							<div className="text-center py-4">
								<p className="text-sm text-muted-foreground">No attachments</p>
							</div>
						:	<div className="max-h-64 overflow-y-auto space-y-2">
								{attachments.map((url) => {
									const filename = getFilename(url);
									return (
										<div
											key={url}
											className="flex items-center justify-between gap-3 p-2.5 border rounded-md hover:bg-hospital-primary/5 transition-colors group"
										>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
													{filename}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													File attachment
												</p>
											</div>
											<div className="flex gap-1 shrink-0">
												<a
													href={url}
													target="_blank"
													rel="noopener noreferrer"
													title="Download attachment"
												>
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-hospital-primary/10"
													>
														<Download className="h-4 w-4 text-hospital-primary" />
													</Button>
												</a>
												{isStudent && (
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/20"
														onClick={() => handleRemove(url)}
														title="Remove attachment"
													>
														<X className="h-4 w-4 text-red-600 dark:text-red-400" />
													</Button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
