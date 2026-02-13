/**
 * Type declarations for CSS file imports.
 * Prevents TS2882 errors when importing .css files as side effects.
 */
declare module "*.css" {
	const content: Record<string, string>;
	export default content;
}
