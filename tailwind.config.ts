import type { Config } from "tailwindcss";

// Every color is a CSS variable holding "r g b" channels (see src/lib/themes.ts), so themes can
// swap at runtime and opacity modifiers (bg-accent/30) keep working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: v("ink"),
        page: v("page"),
        white: v("surface"), // "white" surfaces (cards, inputs) follow the theme's surface color
        brand: v("brand"),
        sidebar: {
          DEFAULT: v("sidebar"),
          text: v("sidebar-text"),
          hover: v("sidebar-hover"),
          active: v("nav-active"),
          activeink: v("nav-active-ink"),
        },
        accent: {
          DEFAULT: v("accent"),
          dark: v("accent-dark"),
          soft: v("accent-soft"),
        },
        neutral: {
          50: v("n50"),
          100: v("n100"),
          200: v("n200"),
          300: v("n300"),
          400: v("n400"),
          500: v("n500"),
          600: v("n600"),
          700: v("n700"),
        },
      },
      fontFamily: {
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
