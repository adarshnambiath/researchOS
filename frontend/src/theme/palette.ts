// This file is the single source of truth for all colors in the app.
// Components and CSS reference CSS custom properties (--color-*),
// and main.tsx injects the values from this palette at startup.
// Change a color here and refresh to see it reflected everywhere.

export const palette = {
  background: "#F5F7FB",      // App background
  surface: "#FFFFFF",         // Cards
  sidebar: "#FFFFFF",         // Sidebar

  primary: "#2563EB",         // Blue-600
  secondary: "#60A5FA",       // Blue-400

  border: "#E5E7EB",          // Gray-200

  textPrimary: "#111827",     // Gray-900
  textSecondary: "#4B5563",   // Gray-600
  muted: "#9CA3AF",           // Gray-400

  card: "#FFFFFF",
  hover: "#EFF6FF",           // Light blue hover
  hoverButton: "#2196F3",     // Placeholder for button hover
  input: "#FFFFFF",

  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",

  shadow: "rgba(15, 23, 42, 0.08)",
} as const;

export type Palette = typeof palette;
