import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#111418',
          strong: '#0b0d10',
          muted: '#4a5360',
          subtle: '#7a828d',
        },
        paper: {
          DEFAULT: '#faf7f2',
          panel: '#ffffff',
          rule: '#e6e2db',
          soft: '#f3efe7',
        },
        accent: {
          forward: '#1e4fb6',
          'forward-soft': '#dde6f6',
          backward: '#b04a16',
          'backward-soft': '#f5e2d2',
          gradient: '#117a6a',
          'gradient-soft': '#d6ebe6',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(15, 17, 21, 0.02), 0 1px 2px rgba(15, 17, 21, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
