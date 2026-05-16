/**
 * Read-only revision/review thread for any logbook entry.
 * Fetches from GET /api/v1/entry-revisions?entityType=X&entityId=Y
 */

import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { apiClient } from "@/lib/api/client";

interface Revision {
	id: string;
	version: number;
	kind: "SUBMISSION" | "REVIEW";
	decision: string | null;
	remark: string | null;
	reviewerRole: string | null;
	actorName: string | null;
	createdAt: string;
}

interface Props {
	entityType: string;
	entityId: string;
}

const KIND_COLOR: Record<string, string> = {
	SUBMISSION: "#3b82f6",
	REVIEW:     "#a855f7",
};

const DECISION_COLOR: Record<string, string> = {
	APPROVED:      "#34d399",
	REJECTED:      "#f87171",
	NEEDS_REVISION: "#fb923c",
};

export function RevisionThread({ entityType, entityId }: Props) {
	const [revisions, setRevisions] = useState<Revision[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		apiClient
			.get<{ ok: boolean; data: Revision[] }>("/api/v1/entry-revisions", {
				params: { entityType, entityId },
			})
			.then((res) => {
				if (res.data.ok && res.data.data) setRevisions(res.data.data);
			})
			.finally(() => setLoading(false));
	}, [entityType, entityId]);

	if (loading) {
		return <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />;
	}

	if (revisions.length === 0) {
		return <Text style={styles.empty}>No revision history yet.</Text>;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.heading}>Revision History</Text>
			{revisions.map((rev, idx) => (
				<View key={rev.id} style={styles.item}>
					<View style={styles.connector}>
						<View style={[styles.dot, { backgroundColor: KIND_COLOR[rev.kind] ?? "#64748b" }]} />
						{idx < revisions.length - 1 && <View style={styles.line} />}
					</View>
					<View style={styles.content}>
						<View style={styles.row}>
							<Text style={[styles.kind, { color: KIND_COLOR[rev.kind] ?? "#64748b" }]}>
								{rev.kind === "SUBMISSION" ? "Submitted" : "Reviewed"}
							</Text>
							{rev.decision && (
								<Text style={[styles.decision, { color: DECISION_COLOR[rev.decision] ?? "#94a3b8" }]}>
									{rev.decision.replace(/_/g, " ")}
								</Text>
							)}
						</View>
						{rev.actorName && (
							<Text style={styles.actor}>
								{rev.actorName}
								{rev.reviewerRole ? ` · ${rev.reviewerRole}` : ""}
							</Text>
						)}
						{rev.remark ? <Text style={styles.remark}>{rev.remark}</Text> : null}
						<Text style={styles.date}>
							{new Date(rev.createdAt).toLocaleString("en-IN", {
								day: "numeric", month: "short", year: "numeric",
								hour: "2-digit", minute: "2-digit",
							})}
						</Text>
					</View>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { marginTop: 12 },
	heading: { fontSize: 14, fontWeight: "700", color: "#94a3b8", marginBottom: 12 },
	empty: { color: "#475569", fontSize: 13, marginVertical: 8 },
	item: { flexDirection: "row", gap: 12, marginBottom: 4 },
	connector: { alignItems: "center", width: 16 },
	dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
	line: { flex: 1, width: 2, backgroundColor: "#1e293b", marginTop: 4 },
	content: { flex: 1, backgroundColor: "#1e293b", borderRadius: 10, padding: 12, gap: 4, marginBottom: 8 },
	row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
	kind: { fontSize: 12, fontWeight: "700" },
	decision: { fontSize: 12, fontWeight: "600" },
	actor: { fontSize: 12, color: "#64748b" },
	remark: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },
	date: { fontSize: 11, color: "#334155", marginTop: 2 },
});
