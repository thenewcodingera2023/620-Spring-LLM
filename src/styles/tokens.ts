// Design tokens for "Calculus Inside the Machine".
// Visual language: warm off-white pages, white panels, deep charcoal text, muted rules,
// and three semantic accents (forward = blue, backward = burnt orange, gradient = teal-green).
// These values are kept in sync with tailwind.config.ts.

export const tokens = {
  color: {
    ink: '#111418',
    inkStrong: '#0b0d10',
    inkMuted: '#4a5360',
    inkSubtle: '#7a828d',

    paper: '#faf7f2',
    paperPanel: '#ffffff',
    paperRule: '#e6e2db',
    paperSoft: '#f3efe7',

    accentForward: '#1e4fb6',
    accentForwardSoft: '#dde6f6',
    accentBackward: '#b04a16',
    accentBackwardSoft: '#f5e2d2',
    accentGradient: '#117a6a',
    accentGradientSoft: '#d6ebe6',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
  font: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
} as const;

export type Tokens = typeof tokens;
