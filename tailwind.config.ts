import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        luxor: {
          gold: '#D4AF37',
          darkgold: '#B8941F',
          navy: '#0F2A47',
          sand: '#E8D5B7',
          sandlight: '#F5EBD9',
          ink: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cairo)', 'serif'],
      },
      boxShadow: {
        luxor: '0 10px 40px -10px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
