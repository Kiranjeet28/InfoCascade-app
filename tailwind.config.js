/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:         '#6C63FF',
        'primary-light': '#8B85FF',
        accent:          '#00D9AA',
        border:          '#252A38',
        surface:         '#161923',
        error:           '#FF4D6D',
        warning:         '#FF8C42',
        lab:             '#A855F7',
        tut:             '#3B82F6',
        elective:        '#F59E0B',
        project:         '#10B981',
      },
    },
  },
  plugins: [],
};