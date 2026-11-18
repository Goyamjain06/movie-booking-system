/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { 950: "#07070d", 900: "#0b0b14", 800: "#12121f", 700: "#1a1a2b", 600: "#25253b" },
        brand: { rose: "#ff3d6e", violet: "#7c5cff", amber: "#ffb547" },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.07), 0 18px 50px -12px rgba(0,0,0,0.7)",
        brand: "0 10px 40px -10px rgba(255,61,110,0.55)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "gradient-x": { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        ping2: { "0%": { transform: "scale(1)", opacity: 0.6 }, "100%": { transform: "scale(1.9)", opacity: 0 } },
        beam: { "0%": { transform: "translateX(-120%) skewX(-20deg)" }, "100%": { transform: "translateX(320%) skewX(-20deg)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        ping2: "ping2 2s cubic-bezier(0,0,0.2,1) infinite",
        beam: "beam 1.6s ease-in-out 0.4s both",
      },
    },
  },
  plugins: [],
};
