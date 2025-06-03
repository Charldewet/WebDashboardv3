/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./screens/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: '#F36E3A',
        clay: '#A23E48', // clayRed in theme.ts, using 'clay' as key here as per your config
        avocado: '#6A994E',
        cream: '#FDF6EC',
        dark: '#2E2E2E',
      },
      fontFamily: {
        sans: ['System'], // Default system font
      },
    },
  },
  plugins: [],
}; 