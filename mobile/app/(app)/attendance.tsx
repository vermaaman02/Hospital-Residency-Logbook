/**
 * Attendance tab — placeholder for Phase 4 (camera + GPS).
 */

import React from "react";
import {
	Card,
	Heading,
	IconBubble,
	Screen,
	SectionHeader,
	Text,
	VStack,
} from "@/components/ui";
import { CalendarCheck, MapPin, Camera } from "lucide-react-native";
import { Colors } from "@/lib/theme";

export default function AttendanceScreen() {
	return (
		<Screen scroll pattern="dots">
			<SectionHeader
				title="Attendance"
				subtitle="Camera + GPS attendance marking"
				squiggleColor={Colors.mint}
			/>
			<Card variant="featured-mint">
				<VStack gap="3" align="center">
					<IconBubble
						icon={<CalendarCheck color={Colors.inverse} size={26} strokeWidth={2.5} />}
						tone="mint"
						size={64}
					/>
					<Heading level={2}>Coming soon</Heading>
					<Text variant="muted" style={{ textAlign: "center" }}>
						Camera + GPS attendance marking, calendar view, and analytics
						are scheduled for Phase 4 of the Mobile-app-roadmap.
					</Text>
				</VStack>
			</Card>
		</Screen>
	);
}
