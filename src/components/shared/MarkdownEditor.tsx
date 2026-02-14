/**
 * @module MarkdownEditor
 * @description Reusable inline markdown editor component.
 * Supports basic formatting toolbar (bold, italic, lists, headings).
 * Used in diagnosis fields, faculty remarks, and anywhere markdown input is needed.
 * Toggles between edit and preview mode.
 *
 * @see PG Logbook .md — Used across multiple logbook sections
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Bold,
	Italic,
	List,
	ListOrdered,
	Heading2,
	Eye,
	Pencil,
	Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	minRows?: number;
	compact?: boolean;
	spellCheck?: boolean;
}

/** Render basic markdown to HTML for preview */
export function renderMarkdown(text: string): string {
	if (!text)
		return '<span class="text-muted-foreground italic">No content</span>';

	let html = text
		// Escape HTML
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		// Bold
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		// Italic
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		// Headings
		.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-1">$1</h4>')
		.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-base mt-1">$1</h3>')
		// Horizontal rule
		.replace(/^---$/gm, '<hr class="my-1 border-border">')
		// Unordered list
		.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
		// Ordered list
		.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
		// Line breaks
		.replace(/\n/g, "<br>");

	// Wrap consecutive <li> in <ul>
	html = html.replace(
		/((?:<li class="ml-4 list-disc[^"]*">[^<]*<\/li><br>?)+)/g,
		'<ul class="my-0.5">$1</ul>',
	);
	html = html.replace(
		/((?:<li class="ml-4 list-decimal[^"]*">[^<]*<\/li><br>?)+)/g,
		'<ol class="my-0.5">$1</ol>',
	);

	return html;
}

export function MarkdownEditor({
	value,
	onChange,
	placeholder = "Type here... (supports **bold**, *italic*, - lists)",
	disabled = false,
	className,
	minRows = 3,
	compact = false,
	spellCheck,
}: MarkdownEditorProps) {
	const [isPreview, setIsPreview] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const insertFormatting = useCallback(
		(before: string, after: string = "") => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const selectedText = value.substring(start, end);
			const newText =
				value.substring(0, start) +
				before +
				(selectedText || "text") +
				after +
				value.substring(end);

			onChange(newText);

			requestAnimationFrame(() => {
				textarea.focus();
				const newCursorPos =
					start + before.length + (selectedText || "text").length;
				textarea.setSelectionRange(start + before.length, newCursorPos);
			});
		},
		[value, onChange],
	);

	const insertAtLineStart = useCallback(
		(prefix: string) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const start = textarea.selectionStart;
			const lineStart = value.lastIndexOf("\n", start - 1) + 1;
			const newText =
				value.substring(0, lineStart) + prefix + value.substring(lineStart);
			onChange(newText);

			requestAnimationFrame(() => {
				textarea.focus();
				textarea.setSelectionRange(
					start + prefix.length,
					start + prefix.length,
				);
			});
		},
		[value, onChange],
	);

	if (disabled) {
		return (
			<div
				className={cn(
					"text-sm prose prose-sm max-w-none",
					compact ? "min-h-6" : "min-h-10",
					className,
				)}
				dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
			/>
		);
	}

	return (
		<div
			className={cn(
				"border rounded-md overflow-hidden bg-background",
				className,
			)}
		>
			{/* Toolbar */}
			<div className="flex items-center gap-0.5 px-1 py-0.5 bg-muted/40 border-b">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Bold"
					onClick={() => insertFormatting("**", "**")}
					tabIndex={-1}
				>
					<Bold className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Italic"
					onClick={() => insertFormatting("*", "*")}
					tabIndex={-1}
				>
					<Italic className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Heading"
					onClick={() => insertAtLineStart("## ")}
					tabIndex={-1}
				>
					<Heading2 className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Bullet list"
					onClick={() => insertAtLineStart("- ")}
					tabIndex={-1}
				>
					<List className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Numbered list"
					onClick={() => insertAtLineStart("1. ")}
					tabIndex={-1}
				>
					<ListOrdered className="h-3 w-3" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					title="Horizontal rule"
					onClick={() => {
						const nl = value.endsWith("\n") ? "" : "\n";
						onChange(value + nl + "---\n");
					}}
					tabIndex={-1}
				>
					<Minus className="h-3 w-3" />
				</Button>

				<div className="flex-1" />

				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-xs gap-1"
					onClick={() => setIsPreview(!isPreview)}
					tabIndex={-1}
				>
					{isPreview ?
						<>
							<Pencil className="h-3 w-3" /> Edit
						</>
					:	<>
							<Eye className="h-3 w-3" /> Preview
						</>
					}
				</Button>
			</div>

			{/* Content */}
			{isPreview ?
				<div
					className={cn(
						"p-2 text-sm prose prose-sm max-w-none",
						compact ? "min-h-16" : "min-h-24",
					)}
					dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
				/>
			:	<Textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="border-0 rounded-none focus-visible:ring-0 resize-y text-sm"
					rows={minRows}
					spellCheck={spellCheck}
				/>
			}
		</div>
	);
}
