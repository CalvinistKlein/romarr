/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0b0f17',
          900: '#111827',
          850: '#151e32',
          800: '#1f293d',
          700: '#323f58',
          600: '#475569',
        },
        brand: {
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          accent: '#06b6d4',
          gold: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
}
