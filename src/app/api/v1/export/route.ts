/**
 * GET /api/v1/export
 * Handles stateless secure file exports for student logbooks.
 * Verifies HMAC token, fetches DB data, and streams PDF or Excel.
 */

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { generateRotationPostingsPDF } from "@/actions/rotation-postings";

const SECRET = process.env.CLERK_SECRET_KEY || "fallback_secret_key_123456";

export const dynamic = "force-dynamic";

function verifyDownloadToken(token: string) {
	try {
		const decoded = Buffer.from(token, "base64").toString("utf-8");
		const parts = decoded.split(":");
		if (parts.length < 5) return null;

		const userId = parts[0];
		const module = parts[1];
		const format = parts[2];
		const expiresAt = parseInt(parts[3], 10);
		const signature = parts[4];

		if (Date.now() > expiresAt) return null;

		const payload = `${userId}:${module}:${format}:${expiresAt}`;
		const expectedSignature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

		if (signature !== expectedSignature) return null;

		return { userId, module, format };
	} catch (e) {
		return null;
	}
}

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "—";
	try {
		return new Date(date).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "2-digit",
			year: "2-digit",
		});
	} catch {
		return String(date);
	}
}

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const token = url.searchParams.get("token");

		if (!token) {
			return new Response("Missing download token", { status: 400 });
		}

		const claim = verifyDownloadToken(token);
		if (!claim) {
			return new Response("Invalid or expired download token", { status: 401 });
		}

		const { userId, module, format } = claim;

		// Fetch student user details
		const student = await prisma.user.findUnique({
			where: { id: userId },
			include: { batchRelation: true },
		});
		if (!student) {
			return new Response("Student profile not found", { status: 404 });
		}
		const studentName = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "Student";
		const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
		const dateStr = new Date().toISOString().split("T")[0];

		// ─── CASE PRESENTATIONS & SEMINARS EXPORTS ──────────────────────────
		if (module === "case-presentations" || module === "seminars") {
			const entries = module === "case-presentations"
				? await prisma.casePresentation.findMany({
						where: { userId },
						orderBy: { slNo: "asc" },
				  })
				: await prisma.seminar.findMany({
						where: { userId },
						orderBy: { slNo: "asc" },
				  });

			const facultyList = await prisma.user.findMany({
				where: { role: "FACULTY" as any },
				select: { id: true, firstName: true, lastName: true },
			});
			const facultyMap = new Map(facultyList.map((f) => [f.id, `${f.firstName} ${f.lastName}`]));

			const moduleTitle = module === "case-presentations"
				? "Case Presentations"
				: "Seminar Discussions";

			if (format === "pdf") {
				const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
				const autoTableFn =
					(
						autoTable as unknown as {
							default?: typeof autoTable;
							autoTable?: typeof autoTable;
						}
					).default ??
					(autoTable as unknown as { autoTable?: typeof autoTable }).autoTable ??
					autoTable;

				doc.setFontSize(14);
				doc.text(
					`ACADEMIC ${moduleTitle.toUpperCase()} & DISCUSSION LOG`,
					148,
					15,
					{ align: "center" }
				);

				doc.setFontSize(10);
				doc.text(
					`Student: ${studentName}  |  Batch: ${student.batchRelation?.name || "N/A"}  |  Generated: ${formatDate(new Date())}`,
					10,
					25
				);

				const headers = [
					"Sl.", "Date", "Patient Name", "Age/Sex", "UHID",
					"Complete Diagnosis", "Category", "Faculty Signature", "Status"
				];

				const rows = entries.map((e) => [
					e.slNo.toString(),
					formatDate(e.date),
					e.patientName || "—",
					`${e.patientAge || "—"}/${e.patientSex || "—"}`,
					e.uhid || "—",
					e.completeDiagnosis || "—",
					e.category || "—",
					facultyMap.get(e.facultyId || "") || "—",
					e.status
				]);

				autoTableFn(doc, {
					head: [headers],
					body: rows,
					startY: 32,
					theme: "grid",
					styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
					headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
					columnStyles: {
						0: { cellWidth: 10 },
						1: { cellWidth: 20 },
						2: { cellWidth: 35 },
						3: { cellWidth: 22 },
						4: { cellWidth: 25 },
						5: { cellWidth: 70 },
						6: { cellWidth: 35 },
						7: { cellWidth: 40 },
						8: { cellWidth: 20 }
					}
				});

				const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="${module}_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				// EXCEL FORMAT
				const wb = XLSX.utils.book_new();
				const data = entries.map((e) => ({
					"Sl. No.": e.slNo,
					Date: formatDate(e.date),
					"Patient Name": e.patientName ?? "—",
					Age: e.patientAge ?? "—",
					Sex: e.patientSex ?? "—",
					UHID: e.uhid ?? "—",
					"Complete Diagnosis": e.completeDiagnosis ?? "—",
					Category: e.category ?? "—",
					"Faculty Signature": facultyMap.get(e.facultyId || "") ?? "—",
					Status: e.status,
					Remark: e.facultyRemark ?? "—",
				}));

				const ws = XLSX.utils.json_to_sheet(
					data.length > 0 ? data : [{ "Sl. No.": "", Date: "No entries" }]
				);

				// Set column widths
				ws["!cols"] = [
					{ wch: 8 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 10 },
					{ wch: 16 }, { wch: 36 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 28 }
				];

				XLSX.utils.book_append_sheet(wb, ws, moduleTitle);
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="${module}_${safeName}_${dateStr}.xlsx"`,
					},
				});
			}
		}

		// ─── ROTATION POSTINGS EXPORTS ──────────────────────────────────────
		if (module === "rotation-postings") {
			if (format === "pdf") {
				const pdfBase64 = await generateRotationPostingsPDF(student.id);
				const pdfBuffer = Buffer.from(pdfBase64, "base64");
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="rotation_postings_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				// EXCEL FORMAT
				const entries = await prisma.rotationPosting.findMany({
					where: { userId },
					orderBy: { slNo: "asc" },
				});

				const facultyList = await prisma.user.findMany({
					where: { role: "FACULTY" as any },
					select: { id: true, firstName: true, lastName: true },
				});
				const facultyMap = new Map(facultyList.map((f) => [f.id, `${f.firstName} ${f.lastName}`]));

				const wb = XLSX.utils.book_new();
				const data = entries.map((e) => ({
					"Sl. No.": e.slNo,
					"Rotation Name": e.rotationName,
					"Elective": e.isElective ? "Yes" : "No",
					"Start Date": formatDate(e.startDate),
					"End Date": formatDate(e.endDate),
					"Duration": e.totalDuration ?? "—",
					"Days": e.durationDays ?? "—",
					"Faculty Signature": facultyMap.get(e.facultyId || "") ?? "—",
					Status: e.status,
					Remark: e.facultyRemark ?? "—",
				}));

				const ws = XLSX.utils.json_to_sheet(
					data.length > 0 ? data : [{ "Sl. No.": "", "Rotation Name": "No entries" }]
				);

				ws["!cols"] = [
					{ wch: 8 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
					{ wch: 16 }, { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 28 }
				];

				XLSX.utils.book_append_sheet(wb, ws, "Rotation Postings");
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="rotation_postings_${safeName}_${dateStr}.xlsx"`,
					},
				});
			}
		}

		return new Response("Unknown export module", { status: 400 });
	} catch (e) {
		console.error("[Export Route Handler Error]", e);
		return new Response("Internal Server Error", { status: 500 });
	}
}
