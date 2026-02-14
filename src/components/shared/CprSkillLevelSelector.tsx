/**
 * @module CprSkillLevelSelector
 * @description Radio group for S/TM/TL skill levels, specific to CPR procedures.
 *
 * @see PG Logbook .md — CPR procedure skill tracking
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { type ControllerRenderProps } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CPR_SKILL_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CprSkillLevelSelectorProps {
	field: ControllerRenderProps;
	disabled?: boolean;
}

export function CprSkillLevelSelector({
	field,
	disabled = false,
}: CprSkillLevelSelectorProps) {
	return (
		<RadioGroup
			onValueChange={field.onChange}
			value={field.value}
			disabled={disabled}
			className="flex flex-wrap gap-3"
		>
			{CPR_SKILL_LEVELS.map((level) => (
				<div key={level.value} className="flex items-center space-x-2">
					<RadioGroupItem value={level.value} id={`cpr-skill-${level.value}`} />
					<Label
						htmlFor={`cpr-skill-${level.value}`}
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
