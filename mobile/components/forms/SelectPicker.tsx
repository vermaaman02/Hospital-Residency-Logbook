/**
 * Modal-based picker for react-hook-form.
 * Renders a pressable that opens a full-screen scrollable option list.
 */

import { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	FlatList,
	StyleSheet,
	SafeAreaView,
	TextInput,
} from "react-native";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export interface SelectOption {
	label: string;
	value: string;
}

interface Props<T extends FieldValues> {
	control: Control<T>;
	name: Path<T>;
	label: string;
	options: SelectOption[];
	error?: string;
	placeholder?: string;
	searchable?: boolean;
}

export function SelectPicker<T extends FieldValues>({
	control,
	name,
	label,
	options,
	error,
	placeholder = "Select…",
	searchable = false,
}: Props<T>) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const filtered = searchable
		? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
		: options;

	return (
		<View style={styles.wrapper}>
			<Text style={styles.label}>{label}</Text>
			<Controller
				control={control}
				name={name}
				render={({ field: { onChange, value } }) => {
					const selected = options.find((o) => o.value === value);
					return (
						<>
							<TouchableOpacity
								style={[styles.trigger, error ? styles.triggerError : null]}
								onPress={() => setOpen(true)}
								activeOpacity={0.8}
							>
								<Text
									style={[
										styles.triggerText,
										!selected && styles.placeholder,
									]}
									numberOfLines={1}
								>
									{selected?.label ?? placeholder}
								</Text>
								<Text style={styles.chevron}>▾</Text>
							</TouchableOpacity>

							<Modal visible={open} animationType="slide" transparent={false}>
								<SafeAreaView style={styles.modal}>
									<View style={styles.modalHeader}>
										<Text style={styles.modalTitle}>{label}</Text>
										<TouchableOpacity onPress={() => { setOpen(false); setQuery(""); }}>
											<Text style={styles.modalClose}>Done</Text>
										</TouchableOpacity>
									</View>
									{searchable && (
										<TextInput
											style={styles.search}
											placeholder="Search…"
											placeholderTextColor="#475569"
											value={query}
											onChangeText={setQuery}
										/>
									)}
									<FlatList
										data={filtered}
										keyExtractor={(item) => item.value}
										renderItem={({ item }) => (
											<TouchableOpacity
												style={[
													styles.option,
													item.value === value && styles.optionSelected,
												]}
												onPress={() => {
													onChange(item.value);
													setOpen(false);
													setQuery("");
												}}
											>
												<Text
													style={[
														styles.optionText,
														item.value === value && styles.optionTextSelected,
													]}
												>
													{item.label}
												</Text>
												{item.value === value && (
													<Text style={styles.checkmark}>✓</Text>
												)}
											</TouchableOpacity>
										)}
										contentContainerStyle={{ paddingBottom: 40 }}
									/>
								</SafeAreaView>
							</Modal>
						</>
					);
				}}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { gap: 6 },
	label: { fontSize: 13, fontWeight: "500", color: "#94a3b8" },
	trigger: {
		backgroundColor: "#0f172a",
		borderRadius: 10,
		padding: 13,
		borderWidth: 1,
		borderColor: "#334155",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	triggerError: { borderColor: "#f87171" },
	triggerText: { fontSize: 14, color: "#f1f5f9", flex: 1 },
	placeholder: { color: "#475569" },
	chevron: { color: "#475569", fontSize: 14 },
	error: { fontSize: 11, color: "#f87171" },
	modal: { flex: 1, backgroundColor: "#0f172a" },
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
	},
	modalTitle: { fontSize: 16, fontWeight: "700", color: "#f1f5f9" },
	modalClose: { fontSize: 14, color: "#3b82f6", fontWeight: "600" },
	search: {
		margin: 12,
		backgroundColor: "#1e293b",
		borderRadius: 10,
		padding: 12,
		color: "#f1f5f9",
		fontSize: 14,
	},
	option: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#1e293b",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	optionSelected: { backgroundColor: "#172554" },
	optionText: { fontSize: 14, color: "#cbd5e1" },
	optionTextSelected: { color: "#60a5fa", fontWeight: "600" },
	checkmark: { color: "#3b82f6", fontSize: 16 },
});
