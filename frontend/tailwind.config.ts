import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        shelter: {
          bg: "#f6f1e8",
          ink: "#1f2320",
          card: "#fff8ee",
          line: "#d4c7b4",
          accent: "#d05a2c",
          strong: "#b24a20",
          muted: "#6d6a66",
        },
      },
      boxShadow: {
        panel: "0 22px 60px rgba(79, 52, 35, 0.18)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
