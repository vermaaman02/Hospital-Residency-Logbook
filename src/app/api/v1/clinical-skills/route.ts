import { NextResponse } from "next/server";
import {
	initializeClinicalSkills,
	getMyClinicalSkills,
	getAvailableClinicalSkillFaculty,
	updateClinicalSkill,
	submitClinicalSkill,
	getClinicalSkillsForReview,
	signClinicalSkill,
	rejectClinicalSkill,
	bulkSignClinicalSkills,
} from "@/actions/clinical-skills";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const typeParam = searchParams.get("type") || "adult";
		const type = typeParam === "pediatric" ? "pediatric" : "adult";
		const mode = searchParams.get("mode");

		if (mode === "review") {
			const reviewSkills = await getClinicalSkillsForReview(type);
			return NextResponse.json({ skills: reviewSkills });
		}

		if (mode === "faculty-list") {
			const facultyList = await getAvailableClinicalSkillFaculty();
			return NextResponse.json({ faculty: facultyList });
		}

		// Student view: initialize skills if empty, then fetch
		await initializeClinicalSkills(type);
		const skills = await getMyClinicalSkills(type);
		const faculty = await getAvailableClinicalSkillFaculty();

		return NextResponse.json({ skills, faculty });
	} catch (e: any) {
		console.error("[GET /api/v1/clinical-skills Error]", e);
		return NextResponse.json(
			{ error: e?.message || "Internal Server Error" },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { action, type: typeParam, id, data, remark, ids } = body;
		const type = typeParam === "pediatric" ? "pediatric" : "adult";

		if (action === "update") {
			if (!id || !data) {
				return NextResponse.json({ error: "Missing skill id or data" }, { status: 400 });
			}
			const result = await updateClinicalSkill(type, id, data);
			return NextResponse.json(result);
		}

		if (action === "submit") {
			if (!id) {
				return NextResponse.json({ error: "Missing skill id" }, { status: 400 });
			}
			const result = await submitClinicalSkill(type, id);
			return NextResponse.json(result);
		}

		if (action === "sign") {
			if (!id) {
				return NextResponse.json({ error: "Missing skill id" }, { status: 400 });
			}
			const result = await signClinicalSkill(type, id, remark);
			return NextResponse.json(result);
		}

		if (action === "reject") {
			if (!id || !remark) {
				return NextResponse.json({ error: "Missing skill id or remark" }, { status: 400 });
			}
			const result = await rejectClinicalSkill(type, id, remark);
			return NextResponse.json(result);
		}

		if (action === "bulk-sign") {
			if (!ids || !Array.isArray(ids) || ids.length === 0) {
				return NextResponse.json({ error: "Missing skill ids array" }, { status: 400 });
			}
			const result = await bulkSignClinicalSkills(type, ids);
			return NextResponse.json(result);
		}

		return NextResponse.json({ error: "Unknown action" }, { status: 400 });
	} catch (e: any) {
		console.error("[POST /api/v1/clinical-skills Error]", e);
		return NextResponse.json(
			{ error: e?.message || "Internal Server Error" },
			{ status: 500 }
		);
	}
}
