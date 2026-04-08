import { useTheme } from '../context/ThemeContext'
import { sounds, setSoundEnabled, isSoundEnabled } from '../utils/sounds'
import { useState } from 'react'

export default function SettingsBar({ style = {} }) {
  const { theme, toggleTheme, t } = useTheme()
  const [soundOn, setSoundOn] = useState(isSoundEnabled())

  const handleSoundToggle = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) sounds.toggle()
  }

  const handleThemeToggle = () => {
    sounds.click()
    toggleTheme()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...style }}>
      {/* Sound toggle */}
      <button
        onClick={handleSoundToggle}
        title={soundOn ? 'Mute sounds' : 'Enable sounds'}
        style={{
          width: '36px', height: '36px', borderRadius: '8px',
          border: `1px solid ${t.border}`,
          background: t.card,
          color: t.textMuted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>

      {/* Theme toggle */}
      <button
        onClick={handleThemeToggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: '36px', height: '36px', borderRadius: '8px',
          border: `1px solid ${t.border}`,
          background: t.card,
          color: t.textMuted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}