/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFA",
        surface: "#FFFFFF",
        "text-primary": "#111111",
        "text-secondary": "#6B7280",
        border: "#E5E7EB",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "heading-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["18px", { lineHeight: "1.4", fontWeight: "500" }],
        "body": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "caption": ["14px", { lineHeight: "1.5", fontWeight: "500" }],
      },
      borderRadius: {
        DEFAULT: "16px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      maxWidth: {
        content: "1200px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
        card: "0 2px 8px 0 rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
}
