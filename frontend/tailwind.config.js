/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF9E6',
          100: '#FFF0C4',
          200: '#FFE48A',
          300: '#FFD44F',
          400: '#FFC31A',
          500: '#f5b301',
          600: '#d99c00',
          700: '#b37f00',
          800: '#8c6300',
          900: '#664700',
        },
        surface: {
          DEFAULT: '#050505',
          secondary: '#0A0A0A',
          card: '#111111',
          hover: '#1A1A1A',
          elevated: '#222222',
        },
        success: {
          DEFAULT: '#00c853',
          light: '#4ADE80',
          bg: 'rgba(0,200,83,0.12)',
          border: 'rgba(0,200,83,0.3)',
        },
        danger: {
          DEFAULT: '#ff1744',
          light: '#F87171',
          bg: 'rgba(255,23,68,0.12)',
          border: 'rgba(255,23,68,0.3)',
        },
        warning: {
          DEFAULT: '#ffab00',
          light: '#FBBF24',
          bg: 'rgba(255,171,0,0.12)',
          border: 'rgba(255,171,0,0.3)',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          bg: 'rgba(59,130,246,0.12)',
          border: 'rgba(59,130,246,0.3)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9BA7C7',
          muted: '#667090',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          light: 'rgba(255,255,255,0.05)',
          elevated: 'rgba(255,255,255,0.12)',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        card: '16px',
        modal: '20px',
        input: '12px',
        badge: '8px',
        tab: '10px',
        premium: '14px',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(245,179,1,0.15)',
        'glow-md': '0 0 20px rgba(245,179,1,0.2)',
        'glow-lg': '0 0 30px rgba(245,179,1,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'modal': '0 8px 40px rgba(0,0,0,0.5)',
        'premium': '0 8px 32px rgba(0,0,0,0.6)',
        'glow-success': '0 0 8px rgba(0,200,83,0.3)',
        'glow-danger': '0 0 8px rgba(255,23,68,0.3)',
        'glow-brand': '0 0 16px rgba(245,179,1,0.25)',
      },
      fontSize: {
        badge: ['9px', { lineHeight: '1', fontWeight: '900', letterSpacing: '0.1em' }],
        label: ['10px', { lineHeight: '1', fontWeight: '900', letterSpacing: '0.15em' }],
        btn:   ['11px', { lineHeight: '1', fontWeight: '900', letterSpacing: '0.1em' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,179,1,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(245,179,1,0.4)' },
        },
      },
    },
  },
  plugins: [],
}
