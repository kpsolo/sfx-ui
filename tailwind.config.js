/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--sfx-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sfx: {
          primary: token('primary'),
          secondary: token('secondary'),
          accent: token('accent'),
          bg: token('bg'),
          surface: token('surface'),
          text: token('text'),
          danger: token('danger'),
          success: token('success'),
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
