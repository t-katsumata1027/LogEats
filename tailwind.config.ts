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
        sans: ["var(--font-noto)", "sans-serif"],
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
    },
  },
  plugins: [],
};

export default config;
