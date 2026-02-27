import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-zen-gothic)", "sans-serif"],
      },
      colors: {
        sage: {
          50: "#f4f6f3",
          100: "#e3e8df",
          200: "#c9d4c2",
          300: "#a5b69a",
          400: "#7f9472",
          500: "#617556",
          600: "#4c5e43",
          700: "#3e4c37",
          800: "#343e2f",
          900: "#2d3529",
        },
        cream: "#faf8f5",
        olive: "#6b7c5c",
      },
      keyframes: {
        fadeOut: {
          "0%, 50%": { opacity: "1" },
          "100%": { opacity: "0", visibility: "hidden" },
        },
        fillBar: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["pastel"],
  },
};

export default config;
