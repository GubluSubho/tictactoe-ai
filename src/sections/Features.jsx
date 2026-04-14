import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

const features = [
  { icon: '🧠', title: 'Minimax AI Engine', desc: 'The AI evaluates every possible game state using the Minimax algorithm with Alpha-Beta pruning, guaranteeing optimal play on Hard mode.', tag: 'Core Algorithm', color: 'accent' },
  { icon: '🌐', title: 'Local Multiplayer', desc: 'Challenge a friend on the same device in pass-and-play mode. Two players, one board, pure skill.', tag: 'Multiplayer', color: 'teal' },
  { icon: '🏆', title: 'Global Leaderboard', desc: 'Compete with players worldwide. Rankings based on ELO rating and total wins.', tag: 'Competitive', color: 'amber' },
  { icon: '📊', title: 'Algorithm Visualizer', desc: 'Watch the Minimax decision tree unfold in real time. Understand AI by seeing it work.', tag: 'Educational', color: 'purple' },
  { icon: '📈', title: 'Game Analytics', desc: 'Detailed match history and win/loss breakdown per difficulty. See where each game was decided.', tag: 'Insights', color: 'accent' },
  { icon: '🎮', title: 'Online Battle', desc: 'Real-time online matches with ELO ranking, spectator mode, game replay, and variable board sizes.', tag: 'Online', color: 'teal' },
]

export default function Features() {
  const { t } = useTheme()
  const cardsRef = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1'
          entry.target.style.transform = 'translateY(0)'
        }
      })
    }, { threshold: 0.1 })
    cardsRef.current.forEach(card => { if (card) observer.observe(card) })
    return () => observer.disconnect()
  }, [])

  const colorMap = {
    accent: { bg: t.accentBg, border: t.accentBorder, text: t.accent },
    teal: { bg: t.tealBg, border: t.tealBorder, text: t.teal },
    amber: { bg: t.amberBg, border: t.amberBorder, text: t.amber },
    purple: { bg: t.purpleBg, border: t.purpleBorder, text: t.purple },
  }

  return (
    <section id="features" style={{ padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '4rem' }}>
        <p style={{ color: t.accent, fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Core Features</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: t.text, lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem' }}>
          Everything you need<br />to play and learn
        </h2>
        <p style={{ color: t.textMuted, fontSize: '1rem', fontWeight: 300, maxWidth: '480px', lineHeight: 1.7 }}>
          From a perfectly optimal AI to real-time multiplayer, a global leaderboard, and a live algorithm visualizer.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {features.map((f, index) => {
          const c = colorMap[f.color]
          return (
            <div key={f.title} ref={el => cardsRef.current[index] = el}
              style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '1.75rem', opacity: 0, transform: 'translateY(30px)', transition: `opacity 0.6s ease ${index * 100}ms, transform 0.6s ease ${index * 100}ms, background 0.3s ease, border-color 0.3s ease`, cursor: 'default', boxShadow: t.shadowCard }}
              onMouseEnter={e => { e.currentTarget.style.background = t.cardHover; e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = t.gradientCard; e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '1.25rem', background: c.bg, border: `1px solid ${c.border}` }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, color: t.text, fontSize: '1rem', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: t.textMuted, fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 300, marginBottom: '1rem' }}>{f.desc}</p>
              <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 500, padding: '0.25rem 0.6rem', borderRadius: '6px', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{f.tag}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}