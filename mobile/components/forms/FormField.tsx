/**
 * Labelled text input for react-hook-form.
 * Usage: <FormField control={control} name="fieldName" label="Label" />
 */

import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

interface Props<T extends FieldValues> extends TextInputProps {
	control: Control<T>;
	name: Path<T>;
	label: string;
	error?: string;
}

export function FormField<T extends FieldValues>({
	control,
	name,
	label,
	error,
	...inputProps
}: Props<T>) {
	return (
		<View style={styles.wrapper}>
			<Text style={styles.label}>{label}</Text>
			<Controller
				control={control}
				name={name}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
						style={[styles.input, error ? styles.inputError : null]}
						onChangeText={onChange}
						onBlur={onBlur}
						value={value != null ? String(value) : ""}
						placeholderTextColor="#475569"
						{...inputProps}
					/>
				)}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { gap: 6 },
	label: { fontSize: 13, fontWeight: "500", color: "#94a3b8" },
	input: {
		backgroundColor: "#0f172a",
		borderRadius: 10,
		padding: 13,
		color: "#f1f5f9",
		fontSize: 14,
		borderWidth: 1,
		borderColor: "#334155",
	},
	inputError: { borderColor: "#f87171" },
	error: { fontSize: 11, color: "#f87171" },
});
