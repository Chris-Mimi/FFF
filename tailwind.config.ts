import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Class type button colors (used dynamically in coach/members/page.tsx)
    'bg-cyan-600', 'hover:bg-cyan-600/20',
    'bg-indigo-600', 'hover:bg-indigo-600/20',
    'bg-rose-600', 'hover:bg-rose-600/20',
    'bg-violet-600', 'hover:bg-violet-600/20',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
