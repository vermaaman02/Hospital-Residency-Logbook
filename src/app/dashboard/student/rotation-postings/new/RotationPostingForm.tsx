/**
 * @module RotationPostingForm
 * @description Client form component for creating/editing rotation postings.
 * Uses GenericLogForm with the rotation posting schema and field config.
 *
 * @see PG Logbook .md — Section: "LOG OF ROTATION POSTINGS DURING PG IN EM"
 */

"use client";

import { GenericLogForm } from "@/components/forms/GenericLogForm";
import {
	rotationPostingSchema,
	type RotationPostingInput,
} from "@/lib/validators/administrative";
import { rotationPostingFields } from "@/lib/constants/rotation-posting-fields";
import {
	createRotationPosting,
	updateRotationPosting,
} from "@/actions/rotation-postings";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type EntryStatus } from "@/types";

interface RotationPostingFormProps {
	initialData?: RotationPostingInput & { id?: string };
	entryStatus?: EntryStatus;
}

export function RotationPostingForm({
	initialData,
	entryStatus,
}: RotationPostingFormProps) {
	const router = useRouter();

	const defaultValues: RotationPostingInput = {
		rotationName: initialData?.rotationName ?? "",
		isElective: initialData?.isElective ?? false,
		startDate: initialData?.startDate,
		endDate: initialData?.endDate,
		totalDuration: initialData?.totalDuration ?? "",
	};

	async function handleSubmit(data: RotationPostingInput) {
		try {
			if (initialData?.id) {
				await updateRotationPosting(initialData.id, data);
				toast.success("Rotation posting updated");
			} else {
				await createRotationPosting(data);
				toast.success("Rotation posting created");
			}
			router.push("/dashboard/student/rotation-postings");
			router.refresh();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to save";
			toast.error(message);
		}
	}

	return (
		<GenericLogForm
			/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
			schema={rotationPostingSchema as any}
			defaultValues={defaultValues}
			fields={rotationPostingFields}
			onSubmit={handleSubmit}
			title="Rotation Posting Entry"
			description="Fill in the rotation posting details as per your physical logbook"
			entryStatus={entryStatus}
			isEditable={
				!entryStatus ||
				entryStatus === "DRAFT" ||
				entryStatus === "NEEDS_REVISION"
			}
		/>
	);
}
