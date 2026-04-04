/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#e94560",
        dark: "#1a1a2e",
        card: "#16213e",
        accent: "#0f3460",
        text: "#eaeaea"
      },
      fontFamily: {
        body: ["Space Grotesk", "sans-serif"],
        display: ["Sora", "sans-serif"]
      }
    }
  },
  plugins: []
};
