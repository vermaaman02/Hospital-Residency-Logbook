/**
 * @module GenericLogForm
 * @description The MOST IMPORTANT component in the entire app.
 * Schema-driven form that renders any logbook entry form through configuration.
 * Handles 100+ form types via Zod schema + field config.
 *
 * @see copilot-instructions.md — Section 6, Section 9
 *
 * @example
 * <GenericLogForm
 *   schema={caseManagementSchema}
 *   defaultValues={{ date: new Date(), patientName: "" }}
 *   fields={caseManagementFields}
 *   onSubmit={handleSubmit}
 *   title="Case Management Log"
 * />
 */

"use client";

import { useForm, type FieldValues, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Save, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { type FormFieldConfig, type EntryStatus } from "@/types";
import { CompetencyLevelSelector } from "@/components/shared/CompetencyLevelSelector";
import { ConfidenceLevelSelector } from "@/components/shared/ConfidenceLevelSelector";
import { SkillLevelSelector } from "@/components/shared/SkillLevelSelector";
import { CprSkillLevelSelector } from "@/components/shared/CprSkillLevelSelector";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useState, useCallback, useEffect, useRef } from "react";

interface GenericLogFormProps<T extends FieldValues> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	schema: any;
	defaultValues: DefaultValues<T>;
	fields: FormFieldConfig[];
	onSubmit: (data: T) => Promise<void>;
	onSaveDraft?: (data: Partial<T>) => void;
	entryStatus?: EntryStatus;
	isEditable?: boolean;
	title: string;
	description?: string;
	isLoading?: boolean;
}

export function GenericLogForm<T extends FieldValues>({
	schema,
	defaultValues,
	fields,
	onSubmit,
	onSaveDraft,
	entryStatus,
	isEditable = true,
	title,
	description,
	isLoading = false,
}: GenericLogFormProps<T>) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const form = useForm<T>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(schema) as any,
		defaultValues,
	});

	const isReadOnly = !isEditable || entryStatus === "SIGNED";

	// Auto-save as draft every 30 seconds
	const handleAutoSave = useCallback(() => {
		if (!onSaveDraft || isReadOnly) return;
		const values = form.getValues();
		onSaveDraft(values as Partial<T>);
	}, [form, onSaveDraft, isReadOnly]);

	useEffect(() => {
		if (onSaveDraft && !isReadOnly) {
			autoSaveTimerRef.current = setInterval(handleAutoSave, 30000);
		}
		return () => {
			if (autoSaveTimerRef.current) {
				clearInterval(autoSaveTimerRef.current);
			}
		};
	}, [handleAutoSave, onSaveDraft, isReadOnly]);

	const handleFormSubmit = async (data: T) => {
		setIsSubmitting(true);
		try {
			await onSubmit(data);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveDraft = async () => {
		if (!onSaveDraft) return;
		setIsSavingDraft(true);
		try {
			const values = form.getValues();
			onSaveDraft(values as Partial<T>);
		} finally {
			setIsSavingDraft(false);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle>{title}</CardTitle>
						{description && <CardDescription>{description}</CardDescription>}
					</div>
					{entryStatus && <StatusBadge status={entryStatus} />}
				</div>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleFormSubmit)}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{fields.map((fieldConfig) => (
								<div
									key={fieldConfig.name}
									className={cn(
										fieldConfig.colSpan === 2 && "md:col-span-2",
										fieldConfig.colSpan === 3 && "lg:col-span-3",
									)}
								>
									<FormField
										control={form.control}
										name={fieldConfig.name as never}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{fieldConfig.label}
													{fieldConfig.required && (
														<span className="text-destructive ml-1">*</span>
													)}
												</FormLabel>
												<FormControl>
													{renderField(fieldConfig, field, isReadOnly)}
												</FormControl>
												{fieldConfig.helpText && (
													<FormDescription>
														{fieldConfig.helpText}
													</FormDescription>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							))}
						</div>

						{/* Action Buttons */}
						{!isReadOnly && (
							<div className="flex items-center gap-3 pt-4 border-t">
								{onSaveDraft && (
									<Button
										type="button"
										variant="outline"
										onClick={handleSaveDraft}
										disabled={isSavingDraft}
									>
										{isSavingDraft ?
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										:	<Save className="mr-2 h-4 w-4" />}
										Save Draft
									</Button>
								)}
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ?
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									:	<Send className="mr-2 h-4 w-4" />}
									Submit for Review
								</Button>
							</div>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

// ======================== FIELD RENDERER ========================

function renderField(
	config: FormFieldConfig,
	field: Record<string, unknown>,
	disabled: boolean,
): React.ReactNode {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fieldProps = field as any;

	switch (config.type) {
		case "text":
			return (
				<Input
					placeholder={
						config.placeholder ?? `Enter ${config.label.toLowerCase()}`
					}
					disabled={disabled || config.disabled}
					{...fieldProps}
				/>
			);

		case "number":
			return (
				<Input
					type="number"
					placeholder={config.placeholder ?? "0"}
					disabled={disabled || config.disabled}
					{...fieldProps}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						(field.onChange as (val: number) => void)(Number(e.target.value))
					}
				/>
			);

		case "textarea":
			return (
				<Textarea
					placeholder={
						config.placeholder ?? `Enter ${config.label.toLowerCase()}`
					}
					disabled={disabled || config.disabled}
					rows={3}
					{...fieldProps}
				/>
			);

		case "date":
			return (
				<DatePickerField
					value={field.value as Date | undefined}
					onChange={field.onChange as (date: Date | undefined) => void}
					disabled={disabled || config.disabled}
				/>
			);

		case "select":
			return (
				<Select
					onValueChange={field.onChange as (val: string) => void}
					value={field.value as string}
					disabled={disabled || config.disabled}
				>
					<SelectTrigger>
						<SelectValue
							placeholder={
								config.placeholder ?? `Select ${config.label.toLowerCase()}`
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{config.options?.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);

		case "radio":
			return (
				<RadioGroup
					onValueChange={field.onChange as (val: string) => void}
					value={field.value as string}
					disabled={disabled || config.disabled}
					className="flex flex-wrap gap-3"
				>
					{config.options?.map((option) => (
						<div key={option.value} className="flex items-center space-x-2">
							<RadioGroupItem
								value={option.value}
								id={`${config.name}-${option.value}`}
							/>
							<Label
								htmlFor={`${config.name}-${option.value}`}
								className="text-sm cursor-pointer"
							>
								{option.label}
							</Label>
						</div>
					))}
				</RadioGroup>
			);

		case "competency":
			return (
				<CompetencyLevelSelector
					field={fieldProps}
					disabled={disabled || config.disabled}
				/>
			);

		case "confidence":
			return (
				<ConfidenceLevelSelector
					field={fieldProps}
					disabled={disabled || config.disabled}
				/>
			);

		case "skill-level":
			return (
				<SkillLevelSelector
					field={fieldProps}
					disabled={disabled || config.disabled}
				/>
			);

		case "cpr-skill-level":
			return (
				<CprSkillLevelSelector
					field={fieldProps}
					disabled={disabled || config.disabled}
				/>
			);

		default:
			return (
				<Input
					placeholder={config.placeholder}
					disabled={disabled || config.disabled}
					{...fieldProps}
				/>
			);
	}
}

// ======================== DATE PICKER FIELD ========================

interface DatePickerFieldProps {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	disabled?: boolean;
}

function DatePickerField({ value, onChange, disabled }: DatePickerFieldProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{value ? format(value, "PPP") : "Pick a date"}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
