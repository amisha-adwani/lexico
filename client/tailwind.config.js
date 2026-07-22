// Add/merge this into your existing tailwind.config.js under theme.extend

module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  screens: {
    md: '920px',
  },
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#191921',
          900: '#202029',
          800: '#2a2a35',
          line: '#3a3a46',
        },
        paper: {
          100: '#f3eee3',
          200: '#eae2d0',
          line: '#d9ceb3',
          ink: '#2b2620',
          inksoft: '#6b6355',
        },
        signal: {
          500: '#5e6ad2',
          400: '#7c86de',
          100: '#e4e5f9',
        },
        amber: {
          DEFAULT: '#c77f2e',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
      },
    },
  },
};