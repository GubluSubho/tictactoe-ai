import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { sounds } from '../utils/sounds'

const modes = [
  { id: 'game', icon: '🧠', label: 'Play vs AI', desc: 'Challenge the Minimax algorithm. Easy, Medium, or Hard.', color: '#c8f04a', rgb: '200,240,74', badge: 'vs AI' },
  { id: 'multiplayer', icon: '👥', label: 'Local Multiplayer', desc: 'Two players, one device. Pass and play with a friend.', color: '#7ef2c8', rgb: '126,242,200', badge: '2 Players' },
  { id: 'online', icon: '🌐', label: 'Online Battle', desc: 'Play online with others. Choose board size 3×3 to 10×10.', color: '#fbbf24', rgb: '251,191,36', badge: 'Online', isNew: true },
  { id: 'tournament', icon: '🏆', label: 'Tournament', desc: 'Bracket-style competition. Up to 8 players, single elimination.', color: '#f97316', rgb: '249,115,22', badge: 'Competitive' },
  { id: 'friends', icon: '👫', label: 'Friends', desc: 'Add friends, see who is online, challenge them directly.', color: '#a082ff', rgb: '160,130,255', badge: 'Social' },
]

export default function ModeSelect() {
  const navigate = useNavigate()
  const { t } = useTheme()

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>

      <button onClick={() => { sounds.click(); navigate('/') }} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '36px', height: '36px', marginBottom: '0.75rem' }}>
          {[...Array(9)].map((_, i) => <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? t.accent : t.border }} />)}
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>TTTAI</h1>
        <p style={{ color: t.textMuted, fontSize: '0.8rem', margin: 0 }}>Choose how you want to play</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
        {modes.map(mode => (
          <button key={mode.id} onClick={() => { sounds.click(); navigate(`/${mode.id}`) }} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.25s ease', boxShadow: t.shadow, textAlign: 'left', width: '100%', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${mode.rgb},0.4)`; e.currentTarget.style.background = `rgba(${mode.rgb},0.04)`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.15)` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = t.shadow }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `rgba(${mode.rgb},0.1)`, border: `1px solid rgba(${mode.rgb},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
              {mode.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: t.text, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {mode.label}
                {mode.isNew && <span style={{ fontSize: '0.58rem', background: `rgba(${mode.rgb},0.15)`, border: `1px solid rgba(${mode.rgb},0.3)`, color: mode.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>NEW</span>}
              </div>
              <div style={{ fontSize: '0.78rem', color: t.textMuted, lineHeight: 1.4 }}>{mode.desc}</div>
            </div>
            <div style={{ fontSize: '0.65rem', color: mode.color, background: `rgba(${mode.rgb},0.08)`, border: `1px solid rgba(${mode.rgb},0.15)`, padding: '0.2rem 0.55rem', borderRadius: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {mode.badge}
            </div>
          </button>
        ))}

        {/* Bottom links */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: t.border }} />
          <button onClick={() => { sounds.click(); navigate('/leaderboard') }} style={{ background: 'transparent', border: 'none', color: t.textFaint, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.75rem', borderRadius: '8px', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.background = 'rgba(251,191,36,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = t.textFaint; e.currentTarget.style.background = 'transparent' }}>
            🏆 Global Leaderboard
          </button>
          <div style={{ flex: 1, height: '1px', background: t.border }} />
        </div>
      </div>
    </div>
  )
}