/**
 * Design tokens for the AIIMS Logbook mobile app.
 * Dark-first, medical-professional aesthetic.
 */

export const Colors = {
	// Backgrounds
	bg: "#0a0e1a",
	bgCard: "#111827",
	bgCardHover: "#1a2235",
	bgInput: "#0d1117",
	bgSurface: "#161f30",

	// Brand
	primary: "#3b82f6",
	primaryDark: "#2563eb",
	primaryLight: "#60a5fa",

	// Accent
	accent: "#8b5cf6",
	accentGlow: "#a78bfa",

	// Status
	success: "#10b981",
	successBg: "#064e3b",
	warning: "#f59e0b",
	warningBg: "#78350f",
	error: "#ef4444",
	errorBg: "#7f1d1d",

	// Text
	textPrimary: "#f1f5f9",
	textSecondary: "#94a3b8",
	textMuted: "#64748b",
	textInverse: "#0f172a",

	// Borders
	border: "#1e293b",
	borderFocus: "#3b82f6",
	borderSubtle: "#334155",

	// Tab bar
	tabActive: "#3b82f6",
	tabInactive: "#475569",
	tabBg: "#0a0e1a",
	tabBorder: "#1e293b",
} as const;

export const Spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	xxl: 24,
	xxxl: 32,
} as const;

export const Radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	full: 9999,
} as const;

export const Font = {
	size: {
		xs: 11,
		sm: 13,
		md: 15,
		lg: 17,
		xl: 20,
		xxl: 24,
		hero: 28,
	},
	weight: {
		normal: "400" as const,
		medium: "500" as const,
		semibold: "600" as const,
		bold: "700" as const,
		extrabold: "800" as const,
	},
} as const;
