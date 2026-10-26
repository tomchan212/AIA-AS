/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F5",
        ink: "#1E293B",
        cocoa: "#92400E",
        blush: "#FB7185",
      },
      fontFamily: {
        sans: ["PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "sans-serif"],
      },
      boxShadow: {
        doodle: "3px 3px 0 0 #1E293B",
      },
    },
  },
  plugins: [],
};
