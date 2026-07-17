import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — deep navy (Caliber)
        primary: {
          50: "#F0F4FA",
          100: "#D9E2F0",
          200: "#B3C5E0",
          300: "#7E9BC9",
          400: "#476193",
          500: "#1E3A6E",
          600: "#16305C",
          700: "#102544",
          800: "#0B1C36",
          900: "#071326",
          DEFAULT: "#16305C",
          hover: "#102544",
          light: "#EAF0FB",
          bg: "#F4F7FC",
        },
        // Accent — electric blue (CTAs, links, focus, active series)
        accent: {
          50: "#E6F2FF",
          100: "#CCE4FF",
          300: "#5CA8FF",
          400: "#2E8FFF",
          500: "#0A84FF",
          600: "#0066E0",
          700: "#0050B3",
          DEFAULT: "#0A84FF",
          hover: "#0066E0",
        },
        // Traffic-light / gap status (semantic) — UNCHANGED (scoring depends on these)
        gap: {
          strong: "#10B981",
          developing: "#F59E0B",
          focus: "#F97316",
          critical: "#EF4444",
        },
        // Semantic aliases
        success: "#10B981",
        warning: "#F59E0B",
        focus: "#F97316",
        danger: "#EF4444",
        info: "#0A84FF",
        // Neutrals / surfaces (cool slate, enterprise)
        surface: {
          DEFAULT: "#FFFFFF",
          raised: "#FFFFFF",
          sunken: "#F4F6FA",
        },
        bg: "#F1F4F9",
        border: {
          DEFAULT: "#E2E8F0",
          strong: "#CBD5E1",
        },
        text: {
          primary: "#0F1B2D",
          secondary: "#475569",
          // 4.76:1 on white — the previous #8190A5 (~3.4:1) failed WCAG AA for
          // the small text (hints, table headers, timestamps) this is used on.
          tertiary: "#64748B",
          inverse: "#EAF0FB",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,45,0.04), 0 1px 3px rgba(15,27,45,0.06)",
        raised: "0 4px 12px rgba(15,27,45,0.08)",
        nav: "0 0 0 1px rgba(15,27,45,0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
