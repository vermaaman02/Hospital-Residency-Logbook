/**
 * Inbox tab — placeholder for Phase 5 (unified review queue).
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
import { Inbox } from "lucide-react-native";
import { Colors } from "@/lib/theme";

export default function InboxScreen() {
	return (
		<Screen scroll pattern="dots">
			<SectionHeader
				title="Inbox"
				subtitle="Sign-off requests, revisions & alerts"
				squiggleColor={Colors.pink}
			/>
			<Card variant="featured-pink">
				<VStack gap="3" align="center">
					<IconBubble
						icon={<Inbox color={Colors.inverse} size={26} strokeWidth={2.5} />}
						tone="pink"
						size={64}
					/>
					<Heading level={2}>Coming soon</Heading>
					<Text variant="muted" style={{ textAlign: "center" }}>
						The unified inbox with revision alerts, sign-off requests, and
						real-time notifications is scheduled for Phase 5.
					</Text>
				</VStack>
			</Card>
		</Screen>
	);
}
