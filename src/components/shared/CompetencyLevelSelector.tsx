/**
 * @module CompetencyLevelSelector
 * @description Radio group for CBD/S/O/MS/MI competency levels.
 * Used in all case management log forms.
 *
 * @see PG Logbook .md — Competency tracking system
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { type ControllerRenderProps } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { COMPETENCY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CompetencyLevelSelectorProps {
	field: ControllerRenderProps;
	disabled?: boolean;
}

export function CompetencyLevelSelector({
	field,
	disabled = false,
}: CompetencyLevelSelectorProps) {
	return (
		<RadioGroup
			onValueChange={field.onChange}
			value={field.value}
			disabled={disabled}
			className="flex flex-wrap gap-3"
		>
			{COMPETENCY_LEVELS.map((level) => (
				<div key={level.value} className="flex items-center space-x-2">
					<RadioGroupItem
						value={level.value}
						id={`competency-${level.value}`}
						className={cn(field.value === level.value && "border-primary")}
					/>
					<Label
						htmlFor={`competency-${level.value}`}
						className={cn(
							"text-sm cursor-pointer",
							disabled && "cursor-not-allowed opacity-50",
						)}
					>
						{level.label}
					</Label>
				</div>
			))}
		</RadioGroup>
	);
}
