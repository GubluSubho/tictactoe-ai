import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Board3D from '../components/Board3D'

export default function Hero() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, isDark } = useTheme()

  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 1.5rem 4rem', position: 'relative', overflow: 'hidden' }}>

      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)' }} />

      {/* Glow */}
      <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: `radial-gradient(circle, ${t.accentBg} 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2rem', position: 'relative' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.accent, animation: 'pulse 2s infinite' }} />
        Minimax Algorithm Powered
      </div>

      {/* Heading */}
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(3rem, 8vw, 6.5rem)', fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1.5rem', position: 'relative' }}>
        <span style={{ display: 'block', color: t.text }}>Tic Tac Toe</span>
        <span style={{ display: 'block', color: t.accent }}>meets AI</span>
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: '1.1rem', color: t.textMuted, maxWidth: '460px', lineHeight: 1.7, marginBottom: '2.5rem', fontWeight: 300, position: 'relative' }}>
        Play against an unbeatable AI powered by Minimax. Challenge friends locally, track your stats, and climb the global leaderboard.
      </p>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', marginBottom: '4rem' }}>
        <button onClick={() => navigate(user ? '/select' : '/auth')} style={{ background: t.accent, color: t.accentText, fontWeight: 600, padding: '0.85rem 2rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', letterSpacing: '-0.01em' }}
          onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'translateY(0)' }}>
          ▶ &nbsp;Play Now
        </button>
        <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', color: t.text, fontWeight: 500, padding: '0.85rem 2rem', borderRadius: '12px', border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.background = t.card }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = 'transparent' }}>
          View Features
        </button>
      </div>

      {/* 3D Board */}
      <div style={{ width: '500px', maxWidth: '90vw', position: 'relative' }}>
        <Board3D />
        <div style={{ position: 'absolute', bottom: '1rem', right: '-1rem', background: t.cardSolid, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: t.textMuted }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.teal, display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          AI is thinking...
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}`}</style>
    </section>
  )
}