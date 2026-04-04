/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#E94560",
        dark: "#1A1A2E",
        card: "#16213E",
        accent: "#0F3460",
        text: "#EAEAEA"
      },
      fontFamily: {
        body: ["Space Grotesk", "sans-serif"],
        display: ["Sora", "sans-serif"]
      }
    },
  },
  plugins: [],
}

