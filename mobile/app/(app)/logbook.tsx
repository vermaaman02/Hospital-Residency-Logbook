/**
 * Logbook tab — entry-point for the 18 NMC logbook modules.
 *
 * For Phase 3 these are placeholders that route to module-specific
 * screens. Each tile uses a rotating decorative palette to keep the
 * "confetti" feel without being overwhelming.
 */

import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
	Activity,
	BookOpen,
	Briefcase,
	Camera,
	CheckSquare,
	ClipboardList,
	Cross,
	FileSearch,
	FlaskConical,
	GraduationCap,
	HeartHandshake,
	Microscope,
	Newspaper,
	PieChart,
	Presentation,
	RefreshCw,
	Siren,
	Stethoscope,
	Syringe,
	TrendingUp,
} from "lucide-react-native";

import {
	Card,
	Heading,
	IconBubble,
	Screen,
	SectionHeader,
	Text,
	VStack,
} from "@/components/ui";
import { Colors, Layout, Spacing } from "@/lib/theme";

type Tone = "accent" | "pink" | "amber" | "mint" | "sky";

type Module = {
	key: string;
	label: string;
	icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
	tone: Tone;
};

const TONES: Tone[] = ["accent", "pink", "amber", "mint", "sky"];

const MODULES: Module[] = [
	{ key: "case-presentations", label: "Case Presentations", icon: Presentation, tone: TONES[0] },
	{ key: "seminars", label: "Seminars & EBM", icon: GraduationCap, tone: TONES[1] },
	{ key: "journal-clubs", label: "Journal Clubs", icon: Newspaper, tone: TONES[2] },
	{ key: "clinical-skills-adult", label: "Clinical Skills (Adult)", icon: Stethoscope, tone: TONES[3] },
	{ key: "clinical-skills-pediatric", label: "Clinical Skills (Pediatric)", icon: HeartHandshake, tone: TONES[4] },
	{ key: "case-management", label: "Case Management", icon: ClipboardList, tone: TONES[0] },
	{ key: "procedures", label: "Procedure Logs", icon: Syringe, tone: TONES[1] },
	{ key: "diagnostics", label: "Diagnostic Skills", icon: Microscope, tone: TONES[2] },
	{ key: "imaging", label: "Imaging Logs", icon: Camera, tone: TONES[3] },
	{ key: "transport", label: "Transport Logs", icon: Activity, tone: TONES[4] },
	{ key: "consent-bad-news", label: "Consent & Bad News", icon: FileSearch, tone: TONES[0] },
	{ key: "life-support", label: "Life-Support Courses", icon: Cross, tone: TONES[1] },
	{ key: "conferences", label: "Conferences", icon: BookOpen, tone: TONES[2] },
	{ key: "research", label: "Research Activities", icon: FlaskConical, tone: TONES[3] },
	{ key: "disaster-drills", label: "Disaster Drills", icon: Siren, tone: TONES[4] },
	{ key: "quality-improvement", label: "Quality Improvement", icon: TrendingUp, tone: TONES[0] },
	{ key: "logbook-reviews", label: "Logbook Reviews", icon: CheckSquare, tone: TONES[1] },
	{ key: "rotation-postings", label: "Rotation Postings", icon: RefreshCw, tone: TONES[2] },
];

export default function LogbookScreen() {
	return (
		<Screen bleed>
			<FlatList
				ListHeaderComponent={
					<View style={styles.header}>
						<SectionHeader
							title="Logbook"
							subtitle="18 NMC-mandated entry types"
							squiggleColor={Colors.accent}
						/>
					</View>
				}
				data={MODULES}
				keyExtractor={(m) => m.key}
				numColumns={1}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				renderItem={({ item }) => {
					const Icon = item.icon;
					return (
						<Card onPress={() => {}}>
							<View style={styles.row}>
								<IconBubble
									tone={item.tone}
									icon={<Icon size={20} color={Colors.inverse} strokeWidth={2.5} />}
									size={44}
								/>
								<View style={styles.rowText}>
									<Heading level={4}>{item.label}</Heading>
									<Text variant="muted">Tap to open</Text>
								</View>
							</View>
						</Card>
					);
				}}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: {
		paddingHorizontal: Layout.screenPadding,
		paddingTop: Spacing["4"],
		paddingBottom: Spacing["2"],
	},
	list: {
		paddingHorizontal: Layout.screenPadding,
		paddingBottom: Spacing["12"],
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing["4"],
	},
	rowText: { flex: 1, gap: Spacing["1"] },
});
