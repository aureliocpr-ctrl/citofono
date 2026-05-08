import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Citofono palette: nero ottone + giallo postino italiano
        ink: {
          DEFAULT: '#0b0b0c',
          soft: '#1c1c1f',
          mute: '#3a3a3f',
        },
        post: {
          DEFAULT: '#ffd400', // giallo postino italiano
          dark: '#d9b300',
          light: '#fff2a8',
        },
        bell: {
          DEFAULT: '#9b8a3f', // ottone del citofono
          dark: '#6b5d28',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [typography],
};

export default config;
