/**
 * AIIMS Patna Logbook — Design Tokens
 * =====================================
 *
 * Implements the "Playful Geometric" design system from `mobile/Design.md`,
 * adapted for a medical / hospital-resident audience.
 *
 * Philosophy: **Stable Grid, Wild Decoration.**
 * - Content (forms, lists, tables) lives in clean, readable surfaces.
 * - Decoration (shapes, hard shadows, confetti) lives around the content.
 * - References the Memphis Group (80s) cleaned up for modern screens.
 *
 * Medical context: We retain the energetic palette so the app feels
 * encouraging to busy residents, but rely on neutrals/violet for the
 * primary actions (calm, trustworthy) and reserve pink/amber/mint as
 * status / decorative accents (never the primary CTA).
 *
 * IMPORTANT: This file is the **single source of truth**. Never hard-code
 * colors, radii, spacing, or shadows in components — always import from
 * `@/lib/theme`.
 */

// ─────────────────────────────────────────────────────────────────────
//  COLORS  — Light Mode (default for the medical resident app)
// ─────────────────────────────────────────────────────────────────────

export const Colors = {
	// Canvas
	background: "#FFFDF5", // Warm cream / paper feel
	backgroundAlt: "#FAF7EC", // Slightly deeper cream for subtle banding
	surface: "#FFFFFF", // Pure-white cards / inputs
	surfaceMuted: "#F1F5F9", // Slate-100 muted blocks
	overlay: "rgba(30, 41, 59, 0.55)", // Modal scrim — slate-800 @ 55%

	// Text & foreground (slate-based, AAA on cream)
	foreground: "#1E293B", // Slate-800 — primary text / borders
	foregroundSoft: "#334155", // Slate-700
	muted: "#64748B", // Slate-500 — secondary text
	mutedSoft: "#94A3B8", // Slate-400 — placeholder
	inverse: "#FFFFFF", // Text on dark/colored bg

	// Brand — Primary action (calm, trustworthy violet)
	accent: "#8B5CF6", // Vivid Violet
	accentDark: "#7C3AED", // Pressed
	accentSoft: "#EDE9FE", // Tinted bg (badges, hover surfaces)
	accentForeground: "#FFFFFF",

	// Decorative palette — rotate for confetti / cards / icons
	pink: "#F472B6", // Hot pink — playful pop / featured
	pinkSoft: "#FCE7F3",
	amber: "#FBBF24", // Optimism / "MOST POPULAR" badges
	amberSoft: "#FEF3C7",
	mint: "#34D399", // Freshness / success
	mintSoft: "#D1FAE5",
	sky: "#38BDF8", // Calm secondary — useful for medical info chips
	skySoft: "#E0F2FE",

	// Status (semantic — used by Badge, Toast, EntryStatus)
	success: "#10B981",
	successSoft: "#D1FAE5",
	successForeground: "#064E3B",

	warning: "#F59E0B",
	warningSoft: "#FEF3C7",
	warningForeground: "#78350F",

	danger: "#EF4444",
	dangerSoft: "#FEE2E2",
	dangerForeground: "#7F1D1D",

	info: "#3B82F6",
	infoSoft: "#DBEAFE",
	infoForeground: "#1E3A8A",

	// Medical-specific semantic helpers (mapped from palette)
	// Used by entry-status chips, attendance markers, signature badges.
	signed: "#10B981", // SIGNED — mint/green
	submitted: "#3B82F6", // SUBMITTED — sky/blue
	draft: "#64748B", // DRAFT — muted slate
	rejected: "#EF4444", // REJECTED — red
	needsRevision: "#F59E0B", // NEEDS_REVISION — amber

	// Borders & dividers
	border: "#E2E8F0", // Slate-200 — subtle
	borderStrong: "#1E293B", // Slate-800 — chunky 2px borders (signature look)
	borderFocus: "#8B5CF6", // Violet focus ring

	// Inputs
	inputBg: "#FFFFFF",
	inputBorder: "#CBD5E1", // Slate-300
	inputPlaceholder: "#94A3B8",

	// Patterns (used by DotGrid / Squiggle / Confetti)
	patternDot: "#E2E8F0", // Faint slate dots on cream
	patternStripe: "#FDE68A", // Amber soft stripes
} as const;

// ─────────────────────────────────────────────────────────────────────
//  SPACING  — 4px base unit (Tailwind-compatible scale)
// ─────────────────────────────────────────────────────────────────────

export const Spacing = {
	"0": 0,
	"0.5": 2,
	"1": 4,
	"1.5": 6,
	"2": 8,
	"3": 12,
	"4": 16,
	"5": 20,
	"6": 24,
	"7": 28,
	"8": 32,
	"10": 40,
	"12": 48,
	"14": 56,
	"16": 64,
	"20": 80,
	"24": 96,
} as const;
export type SpacingToken = keyof typeof Spacing;

// ─────────────────────────────────────────────────────────────────────
//  RADIUS  — Chunky on mobile; mix pill + sharp for "leaf" shapes
// ─────────────────────────────────────────────────────────────────────

export const Radius = {
	none: 0,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	"2xl": 24,
	"3xl": 32,
	pill: 9999,
} as const;

/** Asymmetric "blob" radii — speech-bubble & arch shapes from Design.md */
export const BlobRadius = {
	speechBubble: {
		borderTopLeftRadius: Radius["2xl"],
		borderTopRightRadius: Radius["2xl"],
		borderBottomRightRadius: Radius["2xl"],
		borderBottomLeftRadius: 0,
	},
	speechBubbleAlt: {
		borderTopLeftRadius: Radius["2xl"],
		borderTopRightRadius: Radius["2xl"],
		borderBottomRightRadius: 0,
		borderBottomLeftRadius: Radius["2xl"],
	},
	arch: {
		borderTopLeftRadius: 9999,
		borderTopRightRadius: 9999,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
	},
	leaf: {
		borderTopLeftRadius: 9999,
		borderTopRightRadius: Radius.md,
		borderBottomRightRadius: 9999,
		borderBottomLeftRadius: Radius.md,
	},
} as const;

// ─────────────────────────────────────────────────────────────────────
//  BORDER WIDTHS  — Default 2px ("chunky") borders are a signature
// ─────────────────────────────────────────────────────────────────────

export const BorderWidth = {
	none: 0,
	hair: StyleSheetHair(),
	thin: 1,
	default: 2,
	thick: 3,
	chunky: 4,
} as const;

function StyleSheetHair(): number {
	// Avoid pulling in react-native at module-eval time inside `tokens.ts`
	// (keeps the file usable from web/storybook). 0.5 is a sensible fallback.
	return 0.5;
}

// ─────────────────────────────────────────────────────────────────────
//  HARD SHADOWS  — The "Pop" Shadow.
//  RN doesn't support solid offset shadows natively, so the HardShadow
//  primitive (components/ui/HardShadow.tsx) renders a duplicate filled
//  layer behind the element. These tokens describe the OFFSETS only.
// ─────────────────────────────────────────────────────────────────────

export const HardShadow = {
	none: { offsetX: 0, offsetY: 0, color: "transparent" },
	sm: { offsetX: 2, offsetY: 2, color: Colors.borderStrong },
	md: { offsetX: 4, offsetY: 4, color: Colors.borderStrong },
	lg: { offsetX: 6, offsetY: 6, color: Colors.borderStrong },
	xl: { offsetX: 8, offsetY: 8, color: Colors.borderStrong },
	// Colored shadows for featured / playful cards
	pink: { offsetX: 6, offsetY: 6, color: Colors.pink },
	amber: { offsetX: 6, offsetY: 6, color: Colors.amber },
	mint: { offsetX: 6, offsetY: 6, color: Colors.mint },
	violet: { offsetX: 6, offsetY: 6, color: Colors.accent },
	// Soft "sticker" shadow used on standard cards (Design.md §Cards)
	sticker: { offsetX: 8, offsetY: 8, color: Colors.border },
} as const;
export type HardShadowToken = keyof typeof HardShadow;

// ─────────────────────────────────────────────────────────────────────
//  SOFT SHADOWS  — Used only when we need depth WITHOUT the sticker look
//  (e.g. modals, floating action buttons, tab bar elevation).
// ─────────────────────────────────────────────────────────────────────

export const SoftShadow = {
	none: {
		shadowColor: "transparent",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0,
		shadowRadius: 0,
		elevation: 0,
	},
	sm: {
		shadowColor: "#1E293B",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 2,
	},
	md: {
		shadowColor: "#1E293B",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.12,
		shadowRadius: 14,
		elevation: 4,
	},
	lg: {
		shadowColor: "#1E293B",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.18,
		shadowRadius: 24,
		elevation: 8,
	},
} as const;

// ─────────────────────────────────────────────────────────────────────
//  TYPOGRAPHY  — Scale ratio 1.25 (Major Third)
//
//  Headings:  Outfit       (700, 800)  — geometric sans, rounded edges
//  Body:      Plus Jakarta (400, 500)  — modern humanist geometric
//  Mono:      JetBrains    (400)       — codes/IDs, attendance counters
// ─────────────────────────────────────────────────────────────────────

export const FontFamily = {
	heading: "Outfit_700Bold",
	headingExtra: "Outfit_800ExtraBold",
	bodyRegular: "PlusJakartaSans_400Regular",
	bodyMedium: "PlusJakartaSans_500Medium",
	bodyBold: "PlusJakartaSans_700Bold",
	mono: "JetBrainsMono_400Regular",
} as const;

/** Major Third scale (×1.25). Base = 16. */
export const FontSize = {
	xs: 11,
	sm: 13,
	base: 16,
	md: 18,
	lg: 20,
	xl: 25,
	"2xl": 31,
	"3xl": 39,
	display: 48,
} as const;

export const LineHeight = {
	tight: 1.15,
	snug: 1.25,
	normal: 1.45,
	relaxed: 1.6,
} as const;

export const LetterSpacing = {
	tight: -0.4,
	normal: 0,
	wide: 0.4,
	wider: 1.2, // For uppercase labels (Design.md §Inputs)
} as const;

// ─────────────────────────────────────────────────────────────────────
//  MOTION  — Bouncy, elastic, fun
// ─────────────────────────────────────────────────────────────────────

export const Motion = {
	duration: {
		instant: 80,
		fast: 160,
		base: 240,
		slow: 360,
		slower: 540,
	},
	// Reanimated Easing helpers should consume these via `Easing.bezier(...)`
	easing: {
		// Overshoot / bounce (Design.md §Effects)
		overshoot: [0.34, 1.56, 0.64, 1] as const,
		standard: [0.4, 0.0, 0.2, 1] as const,
		emphasized: [0.2, 0.0, 0.0, 1] as const,
		decelerate: [0.0, 0.0, 0.2, 1] as const,
	},
	// Press-down translate (Candy Button — Design.md §Buttons)
	press: {
		idle: { x: 0, y: 0, shadow: 4 },
		hover: { x: -2, y: -2, shadow: 6 },
		active: { x: 2, y: 2, shadow: 2 },
	},
	// Wiggle keyframes (icon hover)
	wiggle: [0, 3, -3, 0] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────
//  Z-INDEX  — Predictable stacking
// ─────────────────────────────────────────────────────────────────────

export const ZIndex = {
	base: 0,
	pattern: -1, // Background decoration sits BEHIND content
	card: 1,
	dropdown: 10,
	header: 20,
	overlay: 50,
	modal: 60,
	toast: 80,
	tooltip: 90,
} as const;

// ─────────────────────────────────────────────────────────────────────
//  LAYOUT  — Containers, breakpoints, touch targets
// ─────────────────────────────────────────────────────────────────────

export const Layout = {
	/** Min touch target — Material/HIG accessibility */
	touchTarget: 48,
	/** Mobile safe content max width — used when previewing on tablet */
	maxContentWidth: 720,
	/** Default screen horizontal padding */
	screenPadding: 20,
	/** Default vertical rhythm between major sections */
	sectionGap: 32,
	/** Tab bar height (custom drawn in TabBar.tsx) */
	tabBarHeight: 72,
} as const;
