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

		// ─── JOURNAL CLUBS EXPORTS ──────────────────────────────────────────
		if (module === "journal-clubs") {
			const entries = await prisma.journalClub.findMany({
				where: { userId },
				orderBy: { slNo: "asc" },
			});

			const facultyList = await prisma.user.findMany({
				where: { role: "FACULTY" as any },
				select: { id: true, firstName: true, lastName: true },
			});
			const facultyMap = new Map(facultyList.map((f) => [f.id, `Dr. ${f.firstName} ${f.lastName}`]));

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
					"JOURNAL CLUB DISCUSSION / CRITICAL APPRAISAL OF LITERATURE PRESENTED",
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
					"Sl. No.", "Date", "Journal Article", "Type of Study", "Faculty Sign", "Status"
				];

				const rows = entries.map((e) => [
					e.slNo.toString(),
					formatDate(e.date),
					e.journalArticle || "—",
					e.typeOfStudy || "—",
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
						0: { cellWidth: 15 },
						1: { cellWidth: 25 },
						2: { cellWidth: 100 },
						3: { cellWidth: 60 },
						4: { cellWidth: 45 },
						5: { cellWidth: 25 }
					}
				});

				const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="journal_clubs_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				// EXCEL FORMAT
				const wb = XLSX.utils.book_new();
				const data = entries.map((e) => ({
					"Sl. No.": e.slNo,
					Date: formatDate(e.date),
					"Journal Article": e.journalArticle ?? "—",
					"Type of Study": e.typeOfStudy ?? "—",
					"Faculty Signature": facultyMap.get(e.facultyId || "") ?? "—",
					Status: e.status,
					Remark: e.facultyRemark ?? "—",
				}));

				const ws = XLSX.utils.json_to_sheet(
					data.length > 0 ? data : [{ "Sl. No.": "", Date: "No entries" }]
				);

				ws["!cols"] = [
					{ wch: 8 }, { wch: 14 }, { wch: 45 }, { wch: 30 },
					{ wch: 28 }, { wch: 12 }, { wch: 28 }
				];

				XLSX.utils.book_append_sheet(wb, ws, "Journal Clubs");
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="journal_clubs_${safeName}_${dateStr}.xlsx"`,
					},
				});
			}
		}

		// ─── INTERNAL ASSESSMENTS EXPORTS ──────────────────────────────────
		if (module === "internal-assessments") {
			const assessments = await prisma.internalAssessment.findMany({
				where: {
					batchId: student.batchId || undefined,
					isPublished: true,
				},
				orderBy: { createdAt: "desc" },
				include: {
					submissions: {
						where: { studentId: userId },
						include: {
							evaluation: {
								include: {
									evaluatedBy: { select: { firstName: true, lastName: true } },
								},
							},
						},
					},
				},
			});

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
				doc.text("INTERNAL ASSESSMENTS & EVALUATIONS REPORT", 148, 15, { align: "center" });

				doc.setFontSize(10);
				doc.text(
					`Student: ${studentName}  |  Batch: ${student.batchRelation?.name || "N/A"}  |  Generated: ${formatDate(new Date())}`,
					10,
					25
				);

				const headers = [
					"Title", "Type", "Deadline", "Status", "Marks", "Grade", "Feedback"
				];

				const rows = assessments.map((a) => {
					const sub = a.submissions[0];
					const ev = sub?.evaluation;
					const status = sub ? sub.status : "PENDING";
					const marksStr = ev?.marks !== null && ev?.marks !== undefined ? `${ev.marks}/${a.maxMarks || 100}` : "—";
					return [
						a.title,
						a.assessmentType,
						formatDate(a.deadline),
						status,
						marksStr,
						ev?.grade || "—",
						ev?.feedback || ev?.rejectionReason || "—"
					];
				});

				autoTableFn(doc, {
					head: [headers],
					body: rows,
					startY: 32,
					theme: "grid",
					styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
					headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
					columnStyles: {
						0: { cellWidth: 65 },
						1: { cellWidth: 30 },
						2: { cellWidth: 30 },
						3: { cellWidth: 30 },
						4: { cellWidth: 25 },
						5: { cellWidth: 20 },
						6: { cellWidth: 65 }
					}
				});

				const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="internal_assessments_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				// EXCEL FORMAT
				const wb = XLSX.utils.book_new();
				const data = assessments.map((a) => {
					const sub = a.submissions[0];
					const ev = sub?.evaluation;
					const status = sub ? sub.status : "PENDING";
					const evaluatorName = ev?.evaluatedBy ? `Dr. ${ev.evaluatedBy.firstName} ${ev.evaluatedBy.lastName}` : "—";
					return {
						Title: a.title,
						Type: a.assessmentType,
						Deadline: formatDate(a.deadline),
						Status: status,
						Marks: ev?.marks ?? "—",
						"Max Marks": a.maxMarks ?? 100,
						Grade: ev?.grade ?? "—",
						Feedback: ev?.feedback ?? ev?.rejectionReason ?? "—",
						"Evaluated By": evaluatorName,
					};
				});

				const ws = XLSX.utils.json_to_sheet(
					data.length > 0 ? data : [{ Title: "", Type: "No assessments found" }]
				);

				ws["!cols"] = [
					{ wch: 35 }, { wch: 15 }, { wch: 14 }, { wch: 14 },
					{ wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 25 }
				];

				XLSX.utils.book_append_sheet(wb, ws, "Internal Assessments");
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="internal_assessments_${safeName}_${dateStr}.xlsx"`,
					},
				});
			}
		}

		// ─── CLINICAL SKILLS EXPORTS ─────────────────────────────────────────
		if (module === "clinical-skills") {
			const skillType = url.searchParams.get("type") === "pediatric" ? "pediatric" : "adult";
			const skills = skillType === "adult"
				? await prisma.clinicalSkillAdult.findMany({
						where: { userId },
						orderBy: { slNo: "asc" },
				  })
				: await prisma.clinicalSkillPediatric.findMany({
						where: { userId },
						orderBy: { slNo: "asc" },
				  });

			if (format === "pdf") {
				const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
				const autoTableFn = (autoTable as any).default || autoTable;

				doc.setFontSize(14);
				doc.text(
					`LOG OF CLINICAL SKILL TRAINING — ${skillType.toUpperCase()} PATIENT`,
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
					"Sl.", `Clinical Skill (${skillType === "adult" ? "Adult" : "Pediatric"})`, "Representative Diagnosis", "Confidence Level", "Status"
				];

				const rows = skills.map((s) => [
					s.slNo.toString(),
					s.skillName,
					s.representativeDiagnosis || "Not filled",
					s.confidenceLevel || "—",
					s.status
				]);

				autoTableFn(doc, {
					head: [headers],
					body: rows,
					startY: 32,
					theme: "grid",
					styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
					headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
					columnStyles: {
						0: { cellWidth: 12 },
						1: { cellWidth: 90 },
						2: { cellWidth: 100 },
						3: { cellWidth: 45 },
						4: { cellWidth: 25 }
					}
				});

				const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="clinical_skills_${skillType}_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				const data = skills.map((s) => ({
					"Sl. No.": s.slNo,
					"Clinical Skill": s.skillName,
					"Representative Patient Clinical Diagnosis": s.representativeDiagnosis || "Not filled",
					"Confidence Level": s.confidenceLevel || "—",
					"Total Times Performed": s.totalTimesPerformed ?? 0,
					Status: s.status,
					"Faculty Remark": s.facultyRemark || "",
				}));

				const wb = XLSX.utils.book_new();
				const ws = XLSX.utils.json_to_sheet(data);
				ws["!cols"] = [
					{ wch: 8 }, { wch: 45 }, { wch: 40 }, { wch: 22 },
					{ wch: 22 }, { wch: 14 }, { wch: 30 }
				];

				XLSX.utils.book_append_sheet(wb, ws, `Clinical Skills (${skillType})`);
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="clinical_skills_${skillType}_${safeName}_${dateStr}.xlsx"`,
					},
				});
			}
		}

		// ─── CASE MANAGEMENT EXPORTS ──────────────────────────────────────────
		if (module === "case-management") {
			const category = url.searchParams.get("category") || "RESUSCITATION";
			const entries = await prisma.caseManagementLog.findMany({
				where: { userId, category: category as never },
				orderBy: { slNo: "asc" },
			});

			const categoryLabel = category.replace(/_/g, " ");

			if (format === "pdf") {
				const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
				const autoTableFn = (autoTable as any).default || autoTable;

				doc.setFontSize(14);
				doc.text(
					`LOG OF CASE MANAGEMENT — ${categoryLabel.toUpperCase()}`,
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
					"Sl.", "Case Sub-Category", "Date", "Patient Info", "Complete Diagnosis", "Competency", "Status"
				];

				const rows = entries.map((e) => [
					e.slNo.toString(),
					e.caseSubCategory || "—",
					e.date ? formatDate(e.date) : "—",
					[e.patientName, e.patientAge ? `${e.patientAge}y` : null, e.patientSex, e.uhid ? `UHID:${e.uhid}` : null].filter(Boolean).join(" / ") || "—",
					e.completeDiagnosis || "Not filled",
					e.competencyLevel || "—",
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
						1: { cellWidth: 55 },
						2: { cellWidth: 25 },
						3: { cellWidth: 55 },
						4: { cellWidth: 80 },
						5: { cellWidth: 22 },
						6: { cellWidth: 25 }
					}
				});

				const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
				return new NextResponse(pdfBuffer, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `attachment; filename="case_management_${category.toLowerCase()}_${safeName}_${dateStr}.pdf"`,
					},
				});
			} else {
				const data = entries.map((e) => ({
					"Sl. No.": e.slNo,
					"Case Sub-Category": e.caseSubCategory || "—",
					Date: e.date ? formatDate(e.date) : "—",
					"Patient Name": e.patientName || "—",
					"Patient Age": e.patientAge ?? "—",
					"Patient Sex": e.patientSex || "—",
					UHID: e.uhid || "—",
					"Complete Diagnosis": e.completeDiagnosis || "Not filled",
					"Competency Level": e.competencyLevel || "—",
					Status: e.status,
					"Faculty Remark": e.facultyRemark || "",
				}));

				const wb = XLSX.utils.book_new();
				const ws = XLSX.utils.json_to_sheet(data);
				ws["!cols"] = [
					{ wch: 8 }, { wch: 40 }, { wch: 14 }, { wch: 25 },
					{ wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 45 },
					{ wch: 16 }, { wch: 14 }, { wch: 30 }
				];

				XLSX.utils.book_append_sheet(wb, ws, "Case Management");
				const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

				return new NextResponse(wbOut, {
					headers: {
						"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="case_management_${category.toLowerCase()}_${safeName}_${dateStr}.xlsx"`,
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
