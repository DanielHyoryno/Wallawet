/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981", // emerald-500
          dark: "#059669",    // emerald-600
          light: "#34d399",   // emerald-400
        }
      }
    }
  },
  plugins: [],
}
