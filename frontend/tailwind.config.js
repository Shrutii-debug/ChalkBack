export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        chalk: {
          bg:      '#0e1a12',
          board:   '#1a2e22',
          surface: '#1e3828',
          border:  '#2d5040',
          green:   '#4ade80',
          muted:   '#6b9e7e',
          text:    '#e8f5ee',
        },
        accent: '#f4c430',
      },
    },
  },
  plugins: [],
}