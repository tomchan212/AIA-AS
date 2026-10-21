import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        enough: "#1f7a4d",
        partial: "#9a6700",
        severe: "#b42318",
        gold: "#8d6b1f",
        ink: "#1c1915",
        paper: "#f6f1e7",
      },
    },
  },
  plugins: [],
};

export default config;
