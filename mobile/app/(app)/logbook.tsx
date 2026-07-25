/**
 * Logbook tab — entry-point for the 18 NMC logbook modules.
 *
 * For Phase 3 these are placeholders that route to module-specific
 * screens. Each tile uses a rotating decorative palette to keep the
 * "confetti" feel without being overwhelming.
 */

import React, { useState, useEffect, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
	Search,
} from "lucide-react-native";

import {
	Card,
	Heading,
	IconBubble,
	Screen,
	SectionHeader,
	Text,
	VStack,
	Input,
	HStack,
	Badge,
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
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [recentKeys, setRecentKeys] = useState<string[]>([]);

	// Load recently used modules from AsyncStorage
	useEffect(() => {
		AsyncStorage.getItem("recent_modules")
			.then((val) => {
				if (val) {
					try {
						setRecentKeys(JSON.parse(val));
					} catch (e) {
						console.error(e);
					}
				}
			})
			.catch((e) => console.error(e));
	}, []);

	const handleModulePress = async (key: string) => {
		// Update recent keys array (move selected to first position)
		const updated = [key, ...recentKeys.filter((k) => k !== key)];
		setRecentKeys(updated);
		await AsyncStorage.setItem("recent_modules", JSON.stringify(updated));

		if (key === "rotation-postings") {
			router.push("/(app)/rotation-postings");
		} else if (key === "case-presentations" || key === "seminars") {
			router.push("/(app)/academic-cases-seminars");
		} else if (key === "journal-clubs") {
			router.push("/(app)/journal-clubs");
		} else if (key === "clinical-skills-adult" || key === "clinical-skills-pediatric") {
			router.push("/(app)/clinical-skills");
		} else if (key === "case-management") {
			router.push("/(app)/case-management");
		} else if (key === "procedures") {
			router.push("/(app)/procedures");
		} else if (key === "diagnostics") {
			router.push("/(app)/diagnostics");
		} else if (key === "imaging") {
			router.push("/(app)/imaging");
		} else if (key === "logbook-reviews") {
			router.push("/(app)/internal-assessments");
		} else {
			// Navigate to other modules as they are implemented
			console.log(`Module ${key} not yet implemented`);
		}
	};

	// Filter and sort modules dynamically
	const sortedModules = useMemo(() => {
		const filtered = MODULES.filter((m) =>
			m.label.toLowerCase().includes(searchQuery.toLowerCase())
		);

		return [...filtered].sort((a, b) => {
			const idxA = recentKeys.indexOf(a.key);
			const idxB = recentKeys.indexOf(b.key);

			if (idxA !== -1 && idxB !== -1) return idxA - idxB;
			if (idxA !== -1) return -1;
			if (idxB !== -1) return 1;
			return 0; // maintain relative default ordering
		});
	}, [recentKeys, searchQuery]);

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

						{/* Search Bar Input */}
						<View style={styles.searchContainer}>
							<Input
								placeholder="Search logbook modules..."
								value={searchQuery}
								onChangeText={setSearchQuery}
								style={styles.searchInput}
							/>
						</View>
					</View>
				}
				data={sortedModules}
				keyExtractor={(m) => m.key}
				numColumns={1}
				contentContainerStyle={styles.list}
				ItemSeparatorComponent={() => <View style={{ height: Spacing["3"] }} />}
				renderItem={({ item, index }) => {
					const Icon = item.icon;
					const isRecentlyUsed = recentKeys.indexOf(item.key) !== -1;
					
					return (
						<Card onPress={() => handleModulePress(item.key)}>
							<View style={styles.row}>
								<IconBubble
									tone={item.tone}
									icon={<Icon size={20} color={Colors.inverse} strokeWidth={2.5} />}
									size={44}
								/>
								<View style={styles.rowText}>
									<HStack justify="space-between" align="center">
										<Heading level={4}>{item.label}</Heading>
										{isRecentlyUsed && recentKeys[0] === item.key && (
											<Badge label="Last used" tone="accent" />
										)}
									</HStack>
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
	searchContainer: {
		marginTop: Spacing["3"],
		marginBottom: Spacing["2"],
	},
	searchInput: {
		height: 44,
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
