import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyConsentLogs,
	getMyBadNewsLogs,
	getMyConsentBadNewsSummary,
	getConsentLogsForReview,
	getBadNewsLogsForReview,
	getAvailableOtherLogFaculty,
	addConsentLogRow,
	addBadNewsLogRow,
	updateConsentLog,
	updateBadNewsLog,
	submitConsentLog,
	submitBadNewsLog,
	deleteConsentLog,
	deleteBadNewsLog,
	signConsentLog,
	signBadNewsLog,
	rejectConsentLog,
	rejectBadNewsLog,
} from "@/actions/other-logs";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl;
		const view = searchParams.get("view");
		const mode = searchParams.get("mode");
		const category = searchParams.get("category"); // "consent" | "bad-news"

		if (view === "summary") {
			const summary = await getMyConsentBadNewsSummary();
			const faculty = await getAvailableOtherLogFaculty();
			return ok({ ...summary, faculty });
		}

		if (mode === "review") {
			if (category === "consent") {
				const entries = await getConsentLogsForReview();
				return ok({ entries });
			}
			if (category === "bad-news") {
				const entries = await getBadNewsLogsForReview();
				return ok({ entries });
			}
			const [consentEntries, badNewsEntries] = await Promise.all([
				getConsentLogsForReview(),
				getBadNewsLogsForReview(),
			]);
			return ok({ consentEntries, badNewsEntries });
		}

		if (category === "consent") {
			const entries = await getMyConsentLogs();
			return ok({ entries });
		}

		if (category === "bad-news") {
			const entries = await getMyBadNewsLogs();
			return ok({ entries });
		}

		const [consentEntries, badNewsEntries] = await Promise.all([
			getMyConsentLogs(),
			getMyBadNewsLogs(),
		]);
		return ok({ consentEntries, badNewsEntries });
	} catch (e: any) {
		console.error("[API v1 consent-bad-news GET] error:", e);
		return err(e.message || "Failed to fetch consent/bad-news logs", 400);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { action, category, id, data, remark } = body;

		if (action === "add") {
			if (category === "consent") {
				const entry = await addConsentLogRow();
				return ok(entry);
			}
			if (category === "bad-news") {
				const entry = await addBadNewsLogRow();
				return ok(entry);
			}
			return err("Missing or invalid category for add", 400);
		}

		if (action === "update") {
			if (!id || !data) return err("Missing id or data", 400);
			if (category === "consent") {
				const res = await updateConsentLog(id, data);
				return ok(res);
			}
			if (category === "bad-news") {
				const res = await updateBadNewsLog(id, data);
				return ok(res);
			}
			return err("Missing or invalid category for update", 400);
		}

		if (action === "submit") {
			if (!id) return err("Missing id", 400);
			if (category === "consent") {
				const res = await submitConsentLog(id);
				return ok(res);
			}
			if (category === "bad-news") {
				const res = await submitBadNewsLog(id);
				return ok(res);
			}
			return err("Missing or invalid category for submit", 400);
		}

		if (action === "delete") {
			if (!id) return err("Missing id", 400);
			if (category === "consent") {
				const res = await deleteConsentLog(id);
				return ok(res);
			}
			if (category === "bad-news") {
				const res = await deleteBadNewsLog(id);
				return ok(res);
			}
			return err("Missing or invalid category for delete", 400);
		}

		if (action === "sign") {
			if (!id) return err("Missing id", 400);
			if (category === "consent") {
				const res = await signConsentLog(id, remark);
				return ok(res);
			}
			if (category === "bad-news") {
				const res = await signBadNewsLog(id, remark);
				return ok(res);
			}
			return err("Missing or invalid category for sign", 400);
		}

		if (action === "reject") {
			if (!id || !remark) return err("Missing id or remark", 400);
			if (category === "consent") {
				const res = await rejectConsentLog(id, remark);
				return ok(res);
			}
			if (category === "bad-news") {
				const res = await rejectBadNewsLog(id, remark);
				return ok(res);
			}
			return err("Missing or invalid category for reject", 400);
		}

		return err("Invalid action", 400);
	} catch (e: any) {
		console.error("[API v1 consent-bad-news POST] error:", e);
		return err(e.message || "Failed to execute consent/bad-news action", 400);
	}
}
