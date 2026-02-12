/**
 * @module AttendanceSheetForm
 * @description Client form for creating/editing weekly attendance.
 * Matches physical logbook: Week range, Batch, Posted Department,
 * and 7 daily entries (Mon-Sun) with Date, Day, Present/Absent, HoD Name.
 *
 * @see PG Logbook .md — "Attendance Sheet for Clinical Posting"
 */

"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Loader2, Save, CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
	attendanceSheetSchema,
	type AttendanceSheetInput,
} from "@/lib/validators/administrative";
import {
	createAttendanceSheet,
	updateAttendanceSheet,
} from "@/actions/attendance";
import { ALL_ROTATION_NAMES } from "@/lib/constants/rotation-postings";
import { useRouter } from "next/navigation";

const DAYS = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
	MONDAY: "Monday",
	TUESDAY: "Tuesday",
	WEDNESDAY: "Wednesday",
	THURSDAY: "Thursday",
	FRIDAY: "Friday",
	SATURDAY: "Saturday",
	SUNDAY: "Sunday",
};

interface AttendanceSheetFormProps {
	initialData?: {
		id: string;
		weekStartDate: Date;
		weekEndDate: Date;
		batch: string | null;
		postedDepartment: string | null;
		entries: Array<{
			day: string;
			date: Date | null;
			presentAbsent: string | null;
			hodName: string | null;
		}>;
	};
}

export function AttendanceSheetForm({ initialData }: AttendanceSheetFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [weekStart, setWeekStart] = useState<Date | undefined>(
		initialData?.weekStartDate ?
			new Date(initialData.weekStartDate)
		:	undefined,
	);

	// Build initial entries
	const initialEntries = DAYS.map((day, i) => {
		const existing = initialData?.entries.find((e) => e.day === day);
		return {
			day: day as (typeof DAYS)[number],
			date: existing?.date ? new Date(existing.date) : undefined,
			presentAbsent: existing?.presentAbsent ?? "",
			hodName: existing?.hodName ?? "",
		};
	});

	const [entries, setEntries] = useState(initialEntries);

	const form = useForm({
		/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
		resolver: zodResolver(attendanceSheetSchema as any),
		defaultValues: {
			weekStartDate:
				initialData?.weekStartDate ?
					new Date(initialData.weekStartDate)
				:	undefined,
			weekEndDate:
				initialData?.weekEndDate ?
					new Date(initialData.weekEndDate)
				:	undefined,
			batch: initialData?.batch ?? "",
			postedDepartment: initialData?.postedDepartment ?? "",
			entries: initialEntries,
		},
	});

	function handleWeekStartChange(date: Date | undefined) {
		if (!date) return;
		setWeekStart(date);
		const endDate = addDays(date, 6);
		form.setValue("weekStartDate", date);
		form.setValue("weekEndDate", endDate);

		// Auto-generate dates for each day
		const updatedEntries = DAYS.map((day, i) => ({
			...entries[i],
			day: day as (typeof DAYS)[number],
			date: addDays(date, i),
		}));
		setEntries(updatedEntries);
		form.setValue("entries", updatedEntries);
	}

	function updateEntry(
		index: number,
		field: "presentAbsent" | "hodName",
		value: string,
	) {
		const updated = [...entries];
		updated[index] = { ...updated[index], [field]: value };
		setEntries(updated);
		form.setValue("entries", updated);
	}

	function handleSave() {
		const formData = form.getValues() as AttendanceSheetInput;
		formData.entries = entries;

		startTransition(async () => {
			try {
				if (initialData?.id) {
					await updateAttendanceSheet(initialData.id, formData);
					toast.success("Attendance sheet updated");
				} else {
					await createAttendanceSheet(formData);
					toast.success("Attendance sheet created");
				}
				router.push("/dashboard/student/attendance");
				router.refresh();
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to save";
				toast.error(message);
			}
		});
	}

	return (
		<div className="space-y-6">
			{/* Week Info */}
			<Card>
				<CardHeader>
					<CardTitle>Week Information</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Week Start Date */}
							<div className="space-y-2">
								<label className="text-sm font-medium">
									Week Starting From
								</label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!weekStart && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{weekStart ?
												format(weekStart, "dd MMM yyyy")
											:	"Select start date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={weekStart}
											onSelect={handleWeekStartChange}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>

							{/* Week End (auto-computed) */}
							<div className="space-y-2">
								<label className="text-sm font-medium">Week Ending</label>
								<Input
									readOnly
									value={
										weekStart ?
											format(addDays(weekStart, 6), "dd MMM yyyy")
										:	"—"
									}
									className="bg-muted"
								/>
							</div>

							{/* Batch */}
							<FormField
								control={form.control}
								name="batch"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Batch</FormLabel>
										<FormControl>
											<Input placeholder="e.g., July 2022" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Posted Department */}
							<FormField
								control={form.control}
								name="postedDepartment"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Posted in Department</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value ?? undefined}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select department" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{ALL_ROTATION_NAMES.map((name) => (
													<SelectItem key={name} value={name}>
														{name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</Form>
				</CardContent>
			</Card>

			{/* Daily Attendance Entries */}
			<Card>
				<CardHeader>
					<CardTitle>Daily Attendance</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{/* Header */}
						<div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
							<div className="col-span-1">Sl. No.</div>
							<div className="col-span-2">Date</div>
							<div className="col-span-2">Day</div>
							<div className="col-span-3">Present/Absent (Remarks)</div>
							<div className="col-span-4">Name of the HoD</div>
						</div>

						{entries.map((entry, index) => (
							<div
								key={entry.day}
								className="grid grid-cols-12 gap-2 items-center"
							>
								<div className="col-span-1 text-sm text-muted-foreground">
									{index + 1}
								</div>
								<div className="col-span-2 text-sm">
									{entry.date ? format(entry.date, "dd/MM") : "—"}
								</div>
								<div className="col-span-2 text-sm font-medium">
									{DAY_LABELS[entry.day]}
								</div>
								<div className="col-span-3">
									<Select
										value={entry.presentAbsent}
										onValueChange={(val) =>
											updateEntry(index, "presentAbsent", val)
										}
									>
										<SelectTrigger className="h-8 text-sm">
											<SelectValue placeholder="Select..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Present">Present</SelectItem>
											<SelectItem value="Absent">Absent</SelectItem>
											<SelectItem value="Leave">Leave</SelectItem>
											<SelectItem value="Holiday">Holiday</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="col-span-4">
									<Input
										className="h-8 text-sm"
										placeholder="HoD name"
										value={entry.hodName}
										onChange={(e) =>
											updateEntry(index, "hodName", e.target.value)
										}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={isPending}>
					{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
					<Save className="h-4 w-4 mr-2" />
					{initialData ? "Update" : "Save"} Attendance Sheet
				</Button>
			</div>
		</div>
	);
}
