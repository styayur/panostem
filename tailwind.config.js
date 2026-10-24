/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--ps-${name}-rgb) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      canvas: { light: token("bg"), dark: token("bg") },
      surface: { light: token("panel"), dark: token("panel") },
      edge: { DEFAULT: token("border"), light: token("border"), dark: token("border") },
      panel: token("panel"), subtle: token("subtle"), ink: token("ink"), muted: token("muted"),
      accent: { DEFAULT: token("accent"), solid: token("solid") },
      danger: token("danger"), warning: token("warning"), success: token("success"),
    },
    borderRadius: { DEFAULT: "var(--ps-radius)", md: "var(--ps-radius-overlay)", lg: "var(--ps-radius-overlay)", xl: "var(--ps-radius-overlay)" },
    fontFamily: { sans: ["var(--ps-font)"], mono: ["var(--ps-mono)"] },
    boxShadow: { lg: "var(--ps-overlay-shadow)", xl: "var(--ps-overlay-shadow)", "2xl": "var(--ps-overlay-shadow)" },
  } },
  plugins: [],
};
