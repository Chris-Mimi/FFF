import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean Teal — blue-shifted teal palette
        teal: {
          50:  '#edfcfd',
          100: '#d2f6fa',
          200: '#a9ecf4',
          300: '#6fdceb',
          400: '#38bfd8',
          500: '#20a5bf',
          600: '#178da6',
          700: '#14758c',
          800: '#105e73',
          900: '#0d4d5f',
          950: '#083340',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
