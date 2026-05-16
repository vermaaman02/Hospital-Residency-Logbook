import type { Control, FieldErrors, FieldValues } from "react-hook-form";

export interface ModuleFormProps {
	control: Control<Record<string, unknown>>;
	errors: FieldErrors<FieldValues>;
}

export type ModuleFormComponent = (props: ModuleFormProps) => React.JSX.Element | null;
