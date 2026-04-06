/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: Only scan actual source files for CSS classes
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    // Exclude test/dev files to reduce CSS bloat
    '!./src/**/*.test.{js,ts,jsx,tsx}',
    '!./src/**/*.spec.{js,ts,jsx,tsx}',
    '!./src/**/*.stories.{js,ts,jsx,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      // Only include colors actually used in your app
      colors: {
        primary: '#6C63FF',
        'primary-light': '#8B85FF',
        accent: '#00D9AA',
        border: '#252A38',
        surface: '#161923',
        error: '#FF4D6D',
        warning: '#FF8C42',
        lab: '#A855F7',
        tut: '#3B82F6',
        elective: '#F59E0B',
        project: '#10B981',
      },

      // Minimal spacing - only what you actually use
      spacing: {
        0: '0',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        // Removed: 7, 9, 11, 13, 15, 18, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
      },

      // Minimal font sizes
      fontSize: {
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '24px'],
        xl: ['18px', '28px'],
        '2xl': ['22px', '32px'],
        '3xl': ['28px', '36px'],
        '4xl': ['32px', '40px'],
      },

      // Minimal border radius
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },

      // Minimal shadow variants
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        none: 'none',
      },
    },
  },

  // PRODUCTION: Only include these utilities if not scanning properly
  safelist: [
    // Dynamic color classes if needed
    'bg-primary',
    'text-primary',
    'border-primary',
    'bg-accent',
    'text-accent',
    'bg-lab',
    'bg-tut',
    'bg-elective',
    'bg-project',
  ],

  // Remove unused plugins to reduce CSS
  plugins: [],

  // Disable animations in production for smaller CSS
  animation: false,
  transition: false,
};
