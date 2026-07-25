import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, BarChart3, BookOpen, FlaskConical, Heart, Stethoscope, Wrench } from "lucide-react-native";
import { Badge, Card, Heading, HStack, Screen, Text, VStack } from "@/components/ui";
import { useEvaluationGraph, EvaluationRecord } from "@/lib/hooks/useEvaluationGraph";
import { Colors, Radius, Spacing } from "@/lib/theme";

const DOMAIN_CONFIG = [
	{ key: "knowledgeScore", label: "Knowledge", icon: BookOpen, color: "#4285F4" },
	{ key: "clinicalSkillScore", label: "Clinical Skills", icon: Stethoscope, color: "#10B981" },
	{ key: "proceduralSkillScore", label: "Procedural Skills", icon: Wrench, color: "#F59E0B" },
	{ key: "softSkillScore", label: "Soft Skills", icon: Heart, color: "#EC4899" },
	{ key: "researchScore", label: "Research", icon: FlaskConical, color: "#8B5CF6" },
] as const;

function ScoreBar({ score, color }: { score: number | null; color: string }) {
	const pct = score ? (score / 5) * 100 : 0;
	return (
		<View style={styles.scoreBarBg}>
			<View style={[styles.scoreBarFill, { width: `${pct}%`, backgroundColor: color }]} />
		</View>
	);
}

export default function EvaluationGraphScreen() {
	const router = useRouter();
	const { records, isLoading } = useEvaluationGraph();

	const renderRecord = ({ item }: { item: EvaluationRecord }) => {
		const statusLabel = item.status === "SIGNED" ? "Signed" : item.status === "SUBMITTED" ? "Submitted" : "Draft";
		const statusTone: "signed" | "submitted" | "draft" = item.status === "SIGNED" ? "signed" : item.status === "SUBMITTED" ? "submitted" : "draft";

		return (
			<Card style={styles.card}>
				<VStack gap="3">
					<HStack justify="space-between" align="center">
						<HStack gap="2" align="center">
							<View style={styles.semBadge}>
								<Text style={styles.semText}>Sem {item.semester}</Text>
							</View>
							{item.overallScore != null && (
								<View style={styles.overallBadge}>
									<Text style={styles.overallText}>{item.overallScore.toFixed(1)} / 5</Text>
								</View>
							)}
						</HStack>
						<Badge label={statusLabel} tone={statusTone} />
					</HStack>

					{DOMAIN_CONFIG.map((d) => {
						const score = item[d.key as keyof EvaluationRecord] as number | null;
						const Icon = d.icon;
						return (
							<HStack key={d.key} gap="2" align="center">
								<Icon size={16} color={d.color} />
								<Text style={styles.domainLabel}>{d.label}</Text>
								<View style={{ flex: 1 }}>
									<ScoreBar score={score} color={d.color} />
								</View>
								<Text style={[styles.scoreText, { color: d.color }]}>{score ?? "—"}</Text>
							</HStack>
						);
					})}

					<View style={styles.marksDivider} />
					<HStack gap="4" justify="space-around">
						<VStack align="center" gap="1">
							<Text variant="muted" style={{ fontSize: 11 }}>Theory Marks</Text>
							<Text style={styles.marksValue}>{item.theoryMarks || "—"}</Text>
						</VStack>
						<VStack align="center" gap="1">
							<Text variant="muted" style={{ fontSize: 11 }}>Practical Marks</Text>
							<Text style={styles.marksValue}>{item.practicalMarks || "—"}</Text>
						</VStack>
					</HStack>

					{item.remarks && (
						<View style={styles.remarksBox}>
							<Text style={styles.remarksText}>{item.remarks}</Text>
						</View>
					)}
				</VStack>
			</Card>
		);
	};

	if (isLoading) {
		return (
			<Screen>
				<View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
			</Screen>
		);
	}

	return (
		<Screen bleed>
			<FlatList
				ListHeaderComponent={
					<View style={styles.header}>
						<HStack align="center" gap="3">
							<Pressable onPress={() => router.back()} hitSlop={8}>
								<ArrowLeft size={24} color={Colors.foreground} />
							</Pressable>
							<VStack gap="1" style={{ flex: 1 }}>
								<Heading level={2}>My Evaluation Graph</Heading>
								<Text variant="muted">Resident Evaluation — 5 domains per semester</Text>
							</VStack>
						</HStack>

						{records.length > 0 && (
							<HStack gap="2" style={styles.summaryRow}>
								<View style={[styles.summaryChip, { backgroundColor: "#E8F0FE" }]}>
									<Text style={{ color: "#1A73E8", fontWeight: "600", fontSize: 12 }}>
										{records.length} Semester{records.length > 1 ? "s" : ""}
									</Text>
								</View>
								<View style={[styles.summaryChip, { backgroundColor: "#ECFDF5" }]}>
									<Text style={{ color: "#065F46", fontWeight: "600", fontSize: 12 }}>
										{records.filter((r) => r.status === "SIGNED").length} Signed
									</Text>
								</View>
							</HStack>
						)}
					</View>
				}
				data={records}
				keyExtractor={(r) => r.id}
				renderItem={renderRecord}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				ListEmptyComponent={
					<Card style={styles.emptyCard}>
						<VStack align="center" gap="2">
							<BarChart3 size={40} color={Colors.muted} />
							<Text variant="muted" style={{ textAlign: "center" }}>
								No evaluation records yet. Your faculty/HOD will fill this in.
							</Text>
						</VStack>
					</Card>
				}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: { padding: Spacing["4"], paddingBottom: Spacing["2"] },
	list: { paddingHorizontal: Spacing["4"], paddingBottom: Spacing["12"] },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	summaryRow: { marginTop: Spacing["3"], flexWrap: "wrap" },
	summaryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
	card: { overflow: "hidden" },
	semBadge: { backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
	semText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
	overallBadge: { backgroundColor: "#FFF7ED", paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, borderWidth: 1, borderColor: "#F59E0B" },
	overallText: { color: "#B45309", fontWeight: "700", fontSize: 13 },
	domainLabel: { width: 100, fontSize: 13, color: Colors.foreground },
	scoreBarBg: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
	scoreBarFill: { height: 8, borderRadius: 4 },
	scoreText: { width: 24, fontWeight: "700", fontSize: 13, textAlign: "right" },
	marksDivider: { height: 1, backgroundColor: "#F1F5F9" },
	marksValue: { fontSize: 16, fontWeight: "700", color: Colors.foreground },
	remarksBox: { backgroundColor: "#F8FAFC", padding: Spacing["2"], borderRadius: Radius.sm, borderLeftWidth: 3, borderLeftColor: Colors.accent },
	remarksText: { fontSize: 13, color: Colors.muted },
	emptyCard: { marginTop: Spacing["4"], paddingVertical: Spacing["6"] },
});
