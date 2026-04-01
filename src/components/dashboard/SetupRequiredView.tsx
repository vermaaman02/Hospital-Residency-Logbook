/**
 * @module SetupRequiredView
 * @description View shown to students and faculty who have not been assigned
 * to a department or batch yet. Explains what is missing.
 */

import { AlertCircle, Building2, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SetupRequiredViewProps {
	role: "student" | "faculty";
	missingDepartment: boolean;
	missingBatch: boolean;
}

export function SetupRequiredView({ role, missingDepartment, missingBatch }: SetupRequiredViewProps) {
	return (
		<div className="flex items-center justify-center min-h-[80vh] p-4 pt-12">
			<Card className="max-w-md w-full border-dashed shadow-sm">
				<CardHeader className="text-center pb-4">
					<div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
						<AlertCircle className="h-6 w-6" />
					</div>
					<CardTitle className="text-xl">Account Setup Incomplete</CardTitle>
					<CardDescription>
						Your account requires administrator setup before you can access {role === "student" ? "forms and logs" : "your dashboard"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
							<div className={`p-2 rounded-md ${!missingBatch ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
								<GraduationCap className="h-4 w-4" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Batch Assignment</p>
								<p className="text-xs text-muted-foreground">
									{missingBatch ? "Waiting for HOD to assign you to a batch" : "You have been assigned to a batch"}
								</p>
							</div>
							{!missingBatch && <Badge className="bg-emerald-500">Done</Badge>}
						</div>
						
						<div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
							<div className={`p-2 rounded-md ${!missingDepartment ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
								<Building2 className="h-4 w-4" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Department Link</p>
								<p className="text-xs text-muted-foreground">
									{missingDepartment ? "Waiting for your batch to be added to a department" : "Your batch is linked to a department"}
								</p>
							</div>
							{!missingDepartment && <Badge className="bg-emerald-500">Done</Badge>}
						</div>
					</div>

					<div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md">
						<p>
							<strong>Next step:</strong> Please contact your Head of Department (HOD) to complete your assignment. Once setup, your dashboard will automatically unlock.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
