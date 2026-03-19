/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#534AB7',
          dark: '#3C3489',
          light: '#EEEDFE',
          xlight: '#F7F4FF',
        },
        accent: {
          DEFAULT: '#1D9E75',
          light: '#E1F5EE',
        },
        warm: {
          DEFAULT: '#D85A30',
          light: '#FAECE7',
        },
        amber: {
          DEFAULT: '#BA7517',
          light: '#FAEEDA',
        },
        text: {
          primary: '#26215C',
          secondary: '#534AB7',
          tertiary: '#8B7DD8',
          muted: '#B4AEDD',
        },
        bg: {
          app: '#F7F4FF',
          card: '#FFFFFF',
          secondary: '#EEEDFE',
        },
        border: '#E8E2FF',
        success: '#1D9E75',
        danger: '#E24B4A',
      },
      fontFamily: {
        'sans-regular': ['DMSans-Regular'],
        'sans-medium': ['DMSans-Medium'],
        'sans-semibold': ['DMSans-SemiBold'],
        'serif-regular': ['PlayfairDisplay-Regular'],
        'serif-medium': ['PlayfairDisplay-Medium'],
      },
      fontSize: {
        'h1': ['28px', { lineHeight: '36px' }],
        'h2': ['20px', { lineHeight: '28px' }],
        'h3': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '22px' }],
        'body-sm': ['12px', { lineHeight: '18px' }],
        'caption': ['11px', { lineHeight: '16px' }],
      },
      spacing: {
        'xxs': '2px',
        'xs': '4px',
        'ms': '12px',
        'ml': '20px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        'xxl': '24px',
      },
    },
  },
  plugins: [],
};
