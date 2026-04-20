import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FBF7F0",
          100: "#F5EDDE",
          200: "#EADBBE",
          300: "#DFC8A0",
        },
        sepia: {
          50: "#F6EFE3",
          100: "#E9D9BD",
          200: "#D4B98A",
          300: "#B8955D",
          400: "#8F6A3A",
          500: "#6B4A25",
          600: "#4A321A",
          700: "#2F1F10",
        },
        accent: {
          rose: "#C97B63",
          olive: "#7A8B5C",
          sky: "#6F8FA3",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        hand: ["Caveat", "cursive"],
      },
      boxShadow: {
        polaroid: "0 2px 4px rgba(47, 31, 16, 0.08), 0 8px 24px rgba(47, 31, 16, 0.12)",
        soft: "0 2px 8px rgba(47, 31, 16, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
