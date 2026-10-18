/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ikut tema OS secara default, sesuai keputusan di desain.md.
  // Kalau nanti mau tambah toggle manual (light/dark) di pengaturan app,
  // ganti ke 'class' dan toggle class "dark" di elemen <html>.
  darkMode: 'media',

  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0d9488', // teal-600 - light mode
          dark: '#2dd4bf',    // teal-400 - dark mode
        },
        safe: {
          DEFAULT: '#16a34a', // green-600
          dark: '#4ade80',    // green-400
        },
        warning: {
          DEFAULT: '#d97706', // amber-600
          dark: '#fbbf24',    // amber-400
        },
        danger: {
          DEFAULT: '#dc2626', // red-600
          dark: '#f87171',    // red-400
        },
        surface: {
          DEFAULT: '#f9fafb', // gray-50
          dark: '#1f2937',    // gray-800
        },
        border: {
          DEFAULT: '#e5e7eb', // gray-200
          dark: '#374151',    // gray-700
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        heading: ['20px', { fontWeight: '600' }],
        subheading: ['16px', { fontWeight: '500' }],
        body: ['14px', { fontWeight: '400' }],
        caption: ['12px', { fontWeight: '400' }],
      },
    },
  },

  plugins: [],
};
