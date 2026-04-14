import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const THEMES = {
  dark: {
    bg: '#060912',
    bg2: '#0d1220',
    bg3: '#111827',
    card: 'rgba(255,255,255,0.04)',
    cardHover: 'rgba(255,255,255,0.07)',
    cardSolid: '#0d1220',
    border: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.16)',
    text: '#f0f4ff',
    textMuted: 'rgba(255,255,255,0.45)',
    textFaint: 'rgba(255,255,255,0.2)',
    accent: '#c8f04a',
    accentText: '#060912',
    accentBg: 'rgba(200,240,74,0.1)',
    accentBorder: 'rgba(200,240,74,0.2)',
    accentHover: '#d4f55e',
    teal: '#7ef2c8',
    tealBg: 'rgba(126,242,200,0.1)',
    tealBorder: 'rgba(126,242,200,0.2)',
    purple: '#a082ff',
    purpleBg: 'rgba(160,130,255,0.1)',
    purpleBorder: 'rgba(160,130,255,0.2)',
    amber: '#fbbf24',
    amberBg: 'rgba(251,191,36,0.1)',
    amberBorder: 'rgba(251,191,36,0.2)',
    danger: '#ef4444',
    dangerBg: 'rgba(239,68,68,0.08)',
    dangerBorder: 'rgba(239,68,68,0.2)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    shadowLg: '0 24px 60px rgba(0,0,0,0.5)',
    shadowCard: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    inputBg: 'rgba(255,255,255,0.03)',
    navBg: 'rgba(6,9,18,0.92)',
    gradientCard: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
    gradientBoard: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
    scrollbar: '#1a2035',
  },
  light: {
    bg: '#f4f6fb',
    bg2: '#ffffff',
    bg3: '#eef0f7',
    card: 'rgba(255,255,255,0.9)',
    cardHover: '#ffffff',
    cardSolid: '#ffffff',
    border: 'rgba(0,0,0,0.08)',
    borderHover: 'rgba(0,0,0,0.16)',
    text: '#0d1220',
    textMuted: 'rgba(13,18,32,0.55)',
    textFaint: 'rgba(13,18,32,0.3)',
    accent: '#5a8a00',
    accentText: '#ffffff',
    accentBg: 'rgba(90,138,0,0.08)',
    accentBorder: 'rgba(90,138,0,0.2)',
    accentHover: '#4a7500',
    teal: '#0d7a5f',
    tealBg: 'rgba(13,122,95,0.08)',
    tealBorder: 'rgba(13,122,95,0.2)',
    purple: '#6b46c1',
    purpleBg: 'rgba(107,70,193,0.08)',
    purpleBorder: 'rgba(107,70,193,0.2)',
    amber: '#b45309',
    amberBg: 'rgba(180,83,9,0.08)',
    amberBorder: 'rgba(180,83,9,0.2)',
    danger: '#dc2626',
    dangerBg: 'rgba(220,38,38,0.06)',
    dangerBorder: 'rgba(220,38,38,0.2)',
    shadow: '0 8px 32px rgba(0,0,0,0.06)',
    shadowLg: '0 24px 60px rgba(0,0,0,0.1)',
    shadowCard: '0 4px 16px rgba(0,0,0,0.06)',
    inputBg: 'rgba(0,0,0,0.03)',
    navBg: 'rgba(244,246,251,0.95)',
    gradientCard: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))',
    gradientBoard: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
    scrollbar: '#d0d5e8',
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.style.background = THEMES[theme].bg
    document.body.style.color = THEMES[theme].text

    // Scrollbar
    const style = document.createElement('style')
    style.id = 'theme-scrollbar'
    const existing = document.getElementById('theme-scrollbar')
    if (existing) existing.remove()
    style.textContent = `
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: ${THEMES[theme].bg}; }
      ::-webkit-scrollbar-thumb { background: ${THEMES[theme].scrollbar}; border-radius: 3px; }
    `
    document.head.appendChild(style)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const t = THEMES[theme]

  return (
    <ThemeContext.Provider value={{ theme, t, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)