/**
 * Reusable patient info subform for Case Presentations, Clinical Skills, etc.
 * Bind to a parent react-hook-form using a nested field prefix.
 */

import { View, Text, StyleSheet } from "react-native";
import { type Control, type FieldValues, type Path } from "react-hook-form";
import { FormField } from "./FormField";
import { SelectPicker } from "./SelectPicker";

const SEX_OPTIONS = [
	{ label: "Male", value: "Male" },
	{ label: "Female", value: "Female" },
	{ label: "Other", value: "Other" },
];

interface Props<T extends FieldValues> {
	control: Control<T>;
	prefix?: string;
	errors?: Record<string, { message?: string }>;
}

export function PatientInfoFields<T extends FieldValues>({
	control,
	prefix = "",
	errors = {},
}: Props<T>) {
	const f = (key: string): Path<T> =>
		(prefix ? `${prefix}.${key}` : key) as Path<T>;

	return (
		<View style={styles.group}>
			<Text style={styles.heading}>Patient Information</Text>
			<FormField
				control={control}
				name={f("patientName")}
				label="Patient Name"
				placeholder="Full name"
				error={errors[f("patientName")]?.message}
			/>
			<FormField
				control={control}
				name={f("uhid")}
				label="UHID"
				placeholder="e.g. 123456"
				error={errors[f("uhid")]?.message}
			/>
			<FormField
				control={control}
				name={f("patientAge")}
				label="Age (years)"
				placeholder="e.g. 45"
				keyboardType="number-pad"
				error={errors[f("patientAge")]?.message}
			/>
			<SelectPicker
				control={control}
				name={f("patientSex")}
				label="Sex"
				options={SEX_OPTIONS}
				error={errors[f("patientSex")]?.message}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	group: { gap: 12 },
	heading: {
		fontSize: 13,
		fontWeight: "700",
		color: "#475569",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginTop: 4,
	},
});
