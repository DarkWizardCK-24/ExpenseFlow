import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399", // accent
          500: "#10b981", // primary-light
          600: "#059669", // primary
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#0b3b2e", // main text
        },
        primary: {
          DEFAULT: "#059669",
          light: "#10b981",
          dark: "#047857",
          accent: "#34d399",
        },
        mint: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
        },
        ink: {
          DEFAULT: "#0b3b2e",
          muted: "#64748b",
          light: "#94a3b8",
        },
        status: {
          danger: "#ef4444",
          info: "#3b82f6",
          warning: "#f59e0b",
          success: "#10b981",
        },
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        "2xs": "0 1px rgba(0, 0, 0, 0.05)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 10px 30px -5px rgba(5, 150, 105, 0.08), 0 4px 6px -2px rgba(5, 150, 105, 0.04)",
        "card-hover": "0 20px 35px -8px rgba(5, 150, 105, 0.16), 0 8px 12px -4px rgba(5, 150, 105, 0.08)",
        emerald: "0 4px 14px 0 rgba(16, 185, 129, 0.35)",
        "emerald-lg": "0 10px 25px -3px rgba(16, 185, 129, 0.4)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
