import { defineConfig } from 'tailwindcss';

export default defineConfig({
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        devrelay: {
          bg: '#04080b',
          surface: '#080f14',
          surface2: '#0d1a22',
          border: 'rgba(0,212,130,0.12)',
          green: '#00d482',
          'green-dim': '#00a862',
          blue: '#00b4ff',
          amber: '#f5a623',
          red: '#ff4d6d',
          text: '#c8ddd5',
          'text-dim': '#4e6e60'
        }
      }
    }
  },
  plugins: []
});