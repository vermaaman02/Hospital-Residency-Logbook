/**
 * @module Footer
 * @description AIIMS Patna branding footer.
 *
 * @see copilot-instructions.md — Section 6
 */

import { INSTITUTION_NAME, DEPARTMENT_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 px-6 py-4">
      <div className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
        <p className="font-medium">{DEPARTMENT_NAME}</p>
        <p>{INSTITUTION_NAME}</p>
        <p className="mt-1">
          &copy; {new Date().getFullYear()} PG Residency Digital Logbook
        </p>
      </div>
    </footer>
  );
}
