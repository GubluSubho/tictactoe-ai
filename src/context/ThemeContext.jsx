import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const THEMES = {
  dark: {
    bg: '#060912',
    bg2: '#0d1220',
    bg3: '#111827',
    card: 'rgba(255,255,255,0.04)',
    cardHover: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.16)',
    text: '#f0f4ff',
    textMuted: 'rgba(255,255,255,0.45)',
    textFaint: 'rgba(255,255,255,0.2)',
    accent: '#c8f04a',
    accentBg: 'rgba(200,240,74,0.1)',
    accentBorder: 'rgba(200,240,74,0.2)',
    teal: '#7ef2c8',
    tealBg: 'rgba(126,242,200,0.1)',
    purple: '#a082ff',
    purpleBg: 'rgba(160,130,255,0.1)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    shadowLg: '0 24px 60px rgba(0,0,0,0.5)',
    inputBg: 'rgba(255,255,255,0.03)',
    navBg: 'rgba(6,9,18,0.92)',
  },
  light: {
    bg: '#f4f6fb',
    bg2: '#ffffff',
    bg3: '#eef0f7',
    card: 'rgba(255,255,255,0.9)',
    cardHover: 'rgba(255,255,255,1)',
    border: 'rgba(0,0,0,0.08)',
    borderHover: 'rgba(0,0,0,0.16)',
    text: '#0d1220',
    textMuted: 'rgba(13,18,32,0.55)',
    textFaint: 'rgba(13,18,32,0.3)',
    accent: '#5a8a00',
    accentBg: 'rgba(90,138,0,0.08)',
    accentBorder: 'rgba(90,138,0,0.2)',
    teal: '#0d7a5f',
    tealBg: 'rgba(13,122,95,0.08)',
    purple: '#6b46c1',
    purpleBg: 'rgba(107,70,193,0.08)',
    shadow: '0 8px 32px rgba(0,0,0,0.08)',
    shadowLg: '0 24px 60px rgba(0,0,0,0.12)',
    inputBg: 'rgba(0,0,0,0.03)',
    navBg: 'rgba(244,246,251,0.92)',
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const t = THEMES[theme]

  useEffect(() => {
    document.body.style.background = t.bg
    document.body.style.color = t.text
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, t, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)