/**
 * @module SkillLevelSelector
 * @description Radio group for S/O/A/PS/PI skill levels.
 * Used in all procedure, imaging, transport, consent, and bad news log forms.
 *
 * @see PG Logbook .md — Skill level tracking
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { type ControllerRenderProps } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SKILL_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SkillLevelSelectorProps {
	field: ControllerRenderProps;
	disabled?: boolean;
}

export function SkillLevelSelector({
	field,
	disabled = false,
}: SkillLevelSelectorProps) {
	return (
		<RadioGroup
			onValueChange={field.onChange}
			value={field.value}
			disabled={disabled}
			className="flex flex-wrap gap-3"
		>
			{SKILL_LEVELS.map((level) => (
				<div key={level.value} className="flex items-center space-x-2">
					<RadioGroupItem value={level.value} id={`skill-${level.value}`} />
					<Label
						htmlFor={`skill-${level.value}`}
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
