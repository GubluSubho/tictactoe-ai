import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

const DEMO_BOARDS = [
  { board: ['X','O','X',null,'O',null,null,null,null], score: '+7', isPositive: true, label: 'AI evaluates this position' },
  { board: ['X','O','X','O','O',null,null,null,null], score: '-3', isPositive: false, label: 'Risky for AI' },
  { board: ['X','O','X',null,'O',null,'O',null,null], score: '+9', isPositive: true, label: 'Best AI move found' },
]

function DemoBoard({ board, score, isPositive, label, t }) {
  const color = isPositive ? t.accent : t.danger
  const bgColor = isPositive ? t.accentBg : t.dangerBg
  const borderColor = isPositive ? t.accentBorder : t.dangerBorder
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '72px', height: '72px', background: t.inputBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '4px' }}>
        {board.map((cell, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', background: !cell ? t.inputBg : 'transparent', fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: cell === 'X' ? t.accent : cell === 'O' ? t.teal : t.textFaint }}>
            {cell || '·'}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.85rem', color, background: bgColor, border: `1px solid ${borderColor}`, padding: '2px 10px', borderRadius: '6px' }}>{score}</div>
      <p style={{ fontSize: '0.65rem', color: t.textFaint, textAlign: 'center', margin: 0, maxWidth: '80px', lineHeight: 1.4 }}>{label}</p>
    </div>
  )
}

export default function AlgoVisualizer() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)' }
      })
    }, { threshold: 0.1 })
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section style={{ padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div ref={sectionRef} style={{ background: t.purpleBg, border: `1px solid ${t.purpleBorder}`, borderRadius: '28px', padding: '3.5rem 3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center', opacity: 0, transform: 'translateY(40px)', transition: 'opacity 0.7s ease, transform 0.7s ease', boxShadow: t.shadow }}>
        <div>
          <p style={{ color: t.purple, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Educational Feature</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: t.text, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Watch the AI<br /><span style={{ color: t.purple }}>think in real time</span>
          </h2>
          <p style={{ color: t.textMuted, fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '2rem', fontWeight: 300 }}>
            The Algorithm Visualizer shows every move the Minimax algorithm evaluates — the full decision tree, scores, and how Alpha-Beta pruning eliminates bad branches before they're even explored.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
            {[
              { icon: '🌳', text: 'Full decision tree rendered live' },
              { icon: '🎯', text: 'Score for every possible board state' },
              { icon: '✂️', text: 'Alpha-Beta pruning shown visually' },
              { icon: '🔢', text: 'Node count — see how many states the AI checks' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', color: t.textMuted }}>{item.text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate(user ? '/visualizer' : '/auth')} style={{ background: t.purple, color: 'white', border: 'none', padding: '0.9rem 2rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: `0 8px 24px ${t.purpleBg}` }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}>
            📊 &nbsp;Try the Visualizer
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '1.5rem', width: '100%' }}>
            <p style={{ fontSize: '0.68rem', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1.25rem', textAlign: 'center', fontWeight: 600 }}>Sample Decision Tree</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
              <DemoBoard {...DEMO_BOARDS[0]} t={t} />
              <div style={{ width: '1px', height: '16px', background: t.border }} />
              <div style={{ width: '180px', height: '1px', background: t.border }} />
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {DEMO_BOARDS.slice(1).map((b, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '1px', height: '16px', background: t.border }} />
                    <DemoBoard {...b} t={t} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            {[{ num: '255', label: 'Max nodes', color: t.purple }, { num: 'α-β', label: 'Pruning', color: t.teal }, { num: '∞', label: 'Depth', color: t.accent }].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '0.85rem 0.5rem' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.num}</div>
                <div style={{ fontSize: '0.62rem', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}