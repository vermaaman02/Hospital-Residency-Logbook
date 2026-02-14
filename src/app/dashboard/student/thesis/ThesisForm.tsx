/**
 * @module ThesisForm
 * @description Client form component for editing thesis details and semester records.
 * Matches physical logbook: Topic, Chief Guide, and per-semester SR/JR, SR, Faculty members.
 *
 * @see PG Logbook .md — Thesis section
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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, GraduationCap } from "lucide-react";
import {
	thesisSchema,
	type ThesisInput,
} from "@/lib/validators/administrative";
import { updateThesis, upsertThesisSemesterRecord } from "@/actions/thesis";

interface ThesisSemesterRecord {
	id: string;
	thesisId: string;
	semester: number;
	srJrMember: string | null;
	srMember: string | null;
	facultyMember: string | null;
}

interface ThesisData {
	id: string;
	userId: string;
	topic: string | null;
	chiefGuide: string | null;
	semesterRecords: ThesisSemesterRecord[];
}

interface ThesisFormProps {
	thesis: ThesisData;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

export function ThesisForm({ thesis }: ThesisFormProps) {
	const [isPending, startTransition] = useTransition();
	const [semesterData, setSemesterData] = useState<
		Record<
			number,
			{
				srJrMember: string;
				srMember: string;
				facultyMember: string;
			}
		>
	>(() => {
		const initial: Record<
			number,
			{ srJrMember: string; srMember: string; facultyMember: string }
		> = {};
		for (const sem of SEMESTERS) {
			const existing = thesis.semesterRecords.find((r) => r.semester === sem);
			initial[sem] = {
				srJrMember: existing?.srJrMember ?? "",
				srMember: existing?.srMember ?? "",
				facultyMember: existing?.facultyMember ?? "",
			};
		}
		return initial;
	});

	const form = useForm<ThesisInput>({
		/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
		resolver: zodResolver(thesisSchema as any),
		defaultValues: {
			topic: thesis.topic ?? "",
			chiefGuide: thesis.chiefGuide ?? "",
		},
	});

	function handleTopicSave(data: ThesisInput) {
		startTransition(async () => {
			try {
				await updateThesis(data);
				toast.success("Thesis details saved");
			} catch {
				toast.error("Failed to save thesis details");
			}
		});
	}

	function handleSemesterSave(semester: number) {
		const data = semesterData[semester];
		if (!data) return;

		startTransition(async () => {
			try {
				await upsertThesisSemesterRecord(thesis.id, {
					semester,
					srJrMember: data.srJrMember || undefined,
					srMember: data.srMember || undefined,
					facultyMember: data.facultyMember || undefined,
				});
				toast.success(`Semester ${semester} record saved`);
			} catch {
				toast.error(`Failed to save semester ${semester} record`);
			}
		});
	}

	function updateSemesterField(
		semester: number,
		field: "srJrMember" | "srMember" | "facultyMember",
		value: string,
	) {
		setSemesterData((prev) => ({
			...prev,
			[semester]: {
				...prev[semester],
				[field]: value,
			},
		}));
	}

	return (
		<div className="space-y-6">
			{/* Thesis Topic & Chief Guide */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<GraduationCap className="h-5 w-5" />
						Thesis Details
					</CardTitle>
					<CardDescription>
						Enter your thesis topic and chief guide as recorded in the physical
						logbook
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleTopicSave)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="topic"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Thesis Topic</FormLabel>
										<FormControl>
											<Input placeholder="Enter your thesis topic" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="chiefGuide"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Thesis Chief Guide</FormLabel>
										<FormControl>
											<Input
												placeholder="Name of your thesis chief guide"
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={isPending}>
								{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								<Save className="h-4 w-4 mr-2" />
								Save Thesis Details
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>

			{/* Per-Semester Records */}
			<Card>
				<CardHeader>
					<CardTitle>Semester-wise Committee Records</CardTitle>
					<CardDescription>
						Record SR/JR Member, SR Member, and Faculty Member for each semester
						(1-6)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{SEMESTERS.map((sem) => (
							<div key={sem}>
								<div className="flex items-center justify-between mb-3">
									<h4 className="font-semibold text-sm">Semester {sem}</h4>
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleSemesterSave(sem)}
										disabled={isPending}
									>
										{isPending ?
											<Loader2 className="h-3 w-3 mr-1 animate-spin" />
										:	<Save className="h-3 w-3 mr-1" />}
										Save
									</Button>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									<div>
										<label className="text-xs text-muted-foreground">
											SR/JR Member
										</label>
										<Input
											placeholder="SR/JR Member name"
											value={semesterData[sem]?.srJrMember ?? ""}
											onChange={(e) =>
												updateSemesterField(sem, "srJrMember", e.target.value)
											}
										/>
									</div>
									<div>
										<label className="text-xs text-muted-foreground">
											SR Member
										</label>
										<Input
											placeholder="SR Member name"
											value={semesterData[sem]?.srMember ?? ""}
											onChange={(e) =>
												updateSemesterField(sem, "srMember", e.target.value)
											}
										/>
									</div>
									<div>
										<label className="text-xs text-muted-foreground">
											Faculty Member
										</label>
										<Input
											placeholder="Faculty Member name"
											value={semesterData[sem]?.facultyMember ?? ""}
											onChange={(e) =>
												updateSemesterField(
													sem,
													"facultyMember",
													e.target.value,
												)
											}
										/>
									</div>
								</div>
								{sem < 6 && <Separator className="mt-4" />}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
