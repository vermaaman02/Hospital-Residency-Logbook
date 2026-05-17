/**
 * Theme barrel — single import point for the entire app.
 *
 *   import { Colors, Spacing, Radius, Typography } from "@/lib/theme";
 *
 * Never import from "@/lib/theme/tokens" or "@/lib/theme/typography"
 * directly in app code — use this barrel so the surface stays stable.
 */

export * from "./tokens";
export * from "./typography";
export { useThemeFonts } from "./fonts";
export { useReducedMotion, usePopIn, useWiggle } from "./motion";
