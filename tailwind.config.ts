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
          // Royal gold palette (matches the new LSM logo)
          gold: '#D4AF37',
          goldlight: '#E8C765',
          darkgold: '#9C7A1E',
          // Deep black / obsidian (logo background)
          navy: '#0A0A0A',          // kept the token name for backwards-compat
          obsidian: '#0A0A0A',
          charcoal: '#1A1A1A',
          // Warm sand accents (kept light for backwards-compat with existing pages)
          sand: '#E8D5B7',
          sandlight: '#FAF3E5',
          cream: '#F5EBD9',
          ink: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cairo)', 'serif'],
      },
      boxShadow: {
        luxor: '0 10px 40px -10px rgba(212, 175, 55, 0.45)',
        'luxor-lg': '0 20px 60px -15px rgba(212, 175, 55, 0.55)',
        'gold-glow': '0 0 30px rgba(212, 175, 55, 0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E8C765 0%, #D4AF37 50%, #9C7A1E 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
