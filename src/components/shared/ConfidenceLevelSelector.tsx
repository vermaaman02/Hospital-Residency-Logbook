/**
 * @module ConfidenceLevelSelector
 * @description Radio group for VC/FC/SC/NC confidence levels.
 * Used in clinical skills and diagnostic logs.
 *
 * @see PG Logbook .md — Confidence tracking system
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { type ControllerRenderProps } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CONFIDENCE_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ConfidenceLevelSelectorProps {
	field: ControllerRenderProps;
	disabled?: boolean;
}

export function ConfidenceLevelSelector({
	field,
	disabled = false,
}: ConfidenceLevelSelectorProps) {
	return (
		<RadioGroup
			onValueChange={field.onChange}
			value={field.value}
			disabled={disabled}
			className="flex flex-wrap gap-3"
		>
			{CONFIDENCE_LEVELS.map((level) => (
				<div key={level.value} className="flex items-center space-x-2">
					<RadioGroupItem
						value={level.value}
						id={`confidence-${level.value}`}
					/>
					<Label
						htmlFor={`confidence-${level.value}`}
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
