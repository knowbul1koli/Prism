/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        prism: {
          bg:      '#08090f',
          surface: '#0e1018',
          card:    '#13151f',
          border:  '#1e2133',
          muted:   '#252840',
          text:    '#c8cde8',
          dim:     '#6b7099',
          // accent gradient stops
          violet:  '#7c3aed',
          indigo:  '#4f46e5',
          cyan:    '#06b6d4',
          emerald: '#10b981',
          amber:   '#f59e0b',
          rose:    '#f43f5e',
        },
      },
      fontFamily: {
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Sora"', '"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"DM Sans"', '"Outfit"', 'sans-serif'],
      },
      backgroundImage: {
        'prism-gradient': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)',
        'prism-glow':     'radial-gradient(ellipse at top left, rgba(124,58,237,0.15) 0%, transparent 60%)',
        'card-glass':     'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'prism':    '0 0 0 1px rgba(124,58,237,0.3), 0 4px 24px rgba(124,58,237,0.15)',
        'card':     '0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 16px rgba(0,0,0,0.4)',
        'glow-v':   '0 0 20px rgba(124,58,237,0.4)',
        'glow-c':   '0 0 20px rgba(6,182,212,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-in':   'slideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
