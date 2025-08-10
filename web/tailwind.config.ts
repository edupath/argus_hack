import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED', // electric purple (new primary)
        secondary: '#1F2937', // slate/dark secondary
        accent: '#00FF9D', // vivid green
        dark: '#0B0F1A',
        white: '#ffffff',
        black: '#000000',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 229, 255, 0.4), 0 0 40px rgba(124, 58, 237, 0.25)'
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} satisfies Config;

