/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skyscanner: {
          primary: '#0770E3',
          primaryHover: '#084EB2',
          bg: '#F1F2F8',
          card: '#FFFFFF',
          text: '#111236',
          secondary: '#68697F',
          success: '#00A698',
          warning: '#FF7110',
          error: '#D1435B',
          border: '#DDDDE5',
        },
        primary: {
          DEFAULT: '#0770E3',
          hover: '#084EB2',
        },
        surface: '#F1F2F8',
        card: '#FFFFFF',
        content: '#111236',
        muted: '#68697F',
        border: '#DDDDE5',
        success: '#00A698',
        warning: '#FF7110',
        error: '#D1435B',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        input: '4px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
