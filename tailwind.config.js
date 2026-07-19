/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFC137',
          dark: '#E6A800',
          light: '#FFE9B8',
        },
      },
      fontFamily: {
        heading: ['"Baloo 2"', 'sans-serif'],
        sans: ['"Nunito"', 'sans-serif'],
      },
      keyframes: {
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.45s ease-out both',
        'slide-in-right': 'slide-in-right 0.45s ease-out both',
      },
    },
  },
  plugins: [],
}
