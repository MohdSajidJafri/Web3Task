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
        twitch: {
          bg: '#0E0E10',
          panel: '#18181B',
          card: '#1F1F23',
          cardHover: '#26262C',
          border: '#2F2F35',
          purple: '#9146FF',
          purpleHover: '#772CE8',
          purpleActive: '#5C16C5',
          purpleLight: '#BF94FF',
          live: '#EB0400',
          synced: '#00F593',
          muted: '#ADADB8',
          text: '#EFEFF1',
          crown: '#E5A100',
          mod: '#00AD03',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
