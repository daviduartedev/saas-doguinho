import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ketchup: "var(--ketchup)",
        "ketchup-hot": "var(--ketchup-hot)",
        mustard: "var(--mustard)",
        paper: "var(--paper)",
        sheet: "var(--sheet)",
        ink: "var(--ink)",
        steam: "var(--steam)",
        counter: "var(--counter)",
        feather: "var(--feather)",
        awning: "var(--awning)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
      fontFamily: {
        sans: ["var(--font-text)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
