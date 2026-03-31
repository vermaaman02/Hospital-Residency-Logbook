/**
 * @module CloudinaryUpload
 * @description Reusable image/file upload component using Cloudinary.
 * Supports multiple file uploads with preview thumbnails and remove functionality.
 * Used for ECG, ABG, X-RAY image uploads in diagnostic skills and imaging logs.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2, ZoomIn } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CloudinaryUploadProps {
	value: string[];
	onChange: (urls: string[]) => void;
	disabled?: boolean;
	maxFiles?: number;
	accept?: string;
}

import { getCloudinarySignature } from "@/actions/cloudinary";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

export function CloudinaryUpload({
	value = [],
	onChange,
	disabled = false,
	maxFiles = 5,
	accept = "image/*",
}: CloudinaryUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			const remainingSlots = maxFiles - value.length;
			if (remainingSlots <= 0) return;

			const filesToUpload = Array.from(files).slice(0, remainingSlots);
			setIsUploading(true);

			try {
				// Feature 4: Use secure signed upload instead of unauthenticated preset
				const { timestamp, signature } = await getCloudinarySignature();
				const uploadedUrls: string[] = [];

				for (const file of filesToUpload) {
					const formData = new FormData();
					formData.append("file", file);
					formData.append("api_key", API_KEY || "");
					formData.append("timestamp", timestamp.toString());
					formData.append("signature", signature);

					const res = await fetch(
						`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
						{ method: "POST", body: formData }
					);

					if (!res.ok) throw new Error("Upload failed");

					const data = await res.json();
					uploadedUrls.push(data.secure_url);
				}

				onChange([...value, ...uploadedUrls]);
			} catch (err) {
				console.error("Upload error:", err);
			} finally {
				setIsUploading(false);
				// Reset input
				if (inputRef.current) inputRef.current.value = "";
			}
		},
		[value, onChange, maxFiles]
	);

	const handleRemove = useCallback(
		(index: number) => {
			const newUrls = value.filter((_, i) => i !== index);
			onChange(newUrls);
		},
		[value, onChange]
	);

	return (
		<div className="space-y-3">
			{/* Upload Area */}
			{!disabled && value.length < maxFiles && (
				<div
					className={cn(
						"relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
						"hover:border-primary/50 hover:bg-primary/5",
						"border-muted-foreground/25"
					)}
					onClick={() => inputRef.current?.click()}
				>
					<input
						ref={inputRef}
						type="file"
						accept={accept}
						multiple
						onChange={handleUpload}
						className="hidden"
						disabled={disabled || isUploading}
					/>
					<div className="flex flex-col items-center gap-2 py-2">
						{isUploading ? (
							<Loader2 className="h-8 w-8 text-primary animate-spin" />
						) : (
							<Upload className="h-8 w-8 text-muted-foreground" />
						)}
						<div>
							<p className="text-sm font-medium">
								{isUploading ? "Uploading..." : "Click to upload images"}
							</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{value.length}/{maxFiles} files uploaded
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Thumbnails */}
			{value.length > 0 && (
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{value.map((url, index) => (
						<div
							key={index}
							className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
						>
							<img
								src={url}
								alt={`Upload ${index + 1}`}
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
								<Button
									type="button"
									variant="secondary"
									size="icon"
									className="h-7 w-7"
									onClick={(e) => {
										e.stopPropagation();
										setPreviewUrl(url);
									}}
								>
									<ZoomIn className="h-3.5 w-3.5" />
								</Button>
								{!disabled && (
									<Button
										type="button"
										variant="destructive"
										size="icon"
										className="h-7 w-7"
										onClick={(e) => {
											e.stopPropagation();
											handleRemove(index);
										}}
									>
										<X className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Lightbox Preview */}
			<Dialog
				open={!!previewUrl}
				onOpenChange={(v) => {
					if (!v) setPreviewUrl(null);
				}}
			>
				<DialogContent className="max-w-4xl max-h-[90vh] p-2">
					<DialogTitle className="sr-only">Image Preview</DialogTitle>
					{previewUrl && (
						<img
							src={previewUrl}
							alt="Preview"
							className="w-full h-full object-contain rounded-lg"
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ======================== READ-ONLY IMAGE GALLERY ========================

interface ImageGalleryProps {
	urls: string[];
	maxDisplay?: number;
}

/**
 * Read-only image gallery for HOD/Faculty review dashboards.
 * Shows thumbnails with lightbox preview.
 */
export function ImageGallery({ urls, maxDisplay = 6 }: ImageGalleryProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	if (!urls || urls.length === 0) return null;

	const displayUrls = urls.slice(0, maxDisplay);
	const remaining = urls.length - maxDisplay;

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
				<ImageIcon className="h-3 w-3" />
				Uploaded Images ({urls.length})
			</p>
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
				{displayUrls.map((url, index) => (
					<div
						key={index}
						className="relative aspect-square rounded-md overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
						onClick={() => setPreviewUrl(url)}
					>
						<img
							src={url}
							alt={`Image ${index + 1}`}
							className="w-full h-full object-cover"
						/>
					</div>
				))}
				{remaining > 0 && (
					<div className="aspect-square rounded-md border bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
						+{remaining}
					</div>
				)}
			</div>

			<Dialog
				open={!!previewUrl}
				onOpenChange={(v) => {
					if (!v) setPreviewUrl(null);
				}}
			>
				<DialogContent className="max-w-4xl max-h-[90vh] p-2">
					<DialogTitle className="sr-only">Image Preview</DialogTitle>
					{previewUrl && (
						<img
							src={previewUrl}
							alt="Preview"
							className="w-full h-full object-contain rounded-lg"
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
