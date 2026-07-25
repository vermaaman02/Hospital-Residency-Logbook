import { NextRequest } from "next/server";
import { ok, err } from "../_lib/respond";
import {
	getMyEvaluationGraph,
} from "@/actions/evaluation-graph";

export async function GET(req: NextRequest) {
	try {
		const records = await getMyEvaluationGraph();
		return ok({ records });
	} catch (e: any) {
		console.error("[API v1 evaluation-graph GET] error:", e);
		return err(e.message || "Failed to fetch evaluation graph", 400);
	}
}
