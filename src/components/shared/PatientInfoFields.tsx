/**
 * @module PatientInfoFields
 * @description Reusable patient info fields: Name, Age, Sex, UHID.
 * Used in ~90% of all logbook forms.
 *
 * @see PG Logbook .md — Patient fields appear in case management, procedures, imaging, etc.
 * @see copilot-instructions.md — Section 6
 */

"use client";

import {
	type UseFormReturn,
	type FieldValues,
	type Path,
} from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SEX_OPTIONS } from "@/lib/constants";

interface PatientInfoFieldsProps<T extends FieldValues> {
	form: UseFormReturn<T>;
	disabled?: boolean;
	nameField?: Path<T>;
	ageField?: Path<T>;
	sexField?: Path<T>;
	uhidField?: Path<T>;
}

export function PatientInfoFields<T extends FieldValues>({
	form,
	disabled = false,
	nameField = "patientName" as Path<T>,
	ageField = "patientAge" as Path<T>,
	sexField = "patientSex" as Path<T>,
	uhidField = "uhid" as Path<T>,
}: PatientInfoFieldsProps<T>) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* Patient Name */}
			<FormField
				control={form.control}
				name={nameField}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Patient Name</FormLabel>
						<FormControl>
							<Input
								placeholder="Enter patient name"
								disabled={disabled}
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Age */}
			<FormField
				control={form.control}
				name={ageField}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Age</FormLabel>
						<FormControl>
							<Input
								type="number"
								placeholder="Age"
								min={0}
								max={150}
								disabled={disabled}
								{...field}
								onChange={(e) => field.onChange(Number(e.target.value))}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* Sex */}
			<FormField
				control={form.control}
				name={sexField}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Sex</FormLabel>
						<Select
							onValueChange={field.onChange}
							value={field.value}
							disabled={disabled}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Select sex" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{SEX_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			{/* UHID */}
			<FormField
				control={form.control}
				name={uhidField}
				render={({ field }) => (
					<FormItem>
						<FormLabel>UHID</FormLabel>
						<FormControl>
							<Input placeholder="Enter UHID" disabled={disabled} {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}
