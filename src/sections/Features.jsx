import { useEffect, useRef } from 'react'

const features = [
  {
    icon: '🧠',
    title: 'Minimax AI Engine',
    desc: 'The AI evaluates every possible game state using the Minimax algorithm with Alpha-Beta pruning, guaranteeing optimal play on Hard mode — it never loses.',
    tag: 'Core Algorithm',
    tagColor: { background: 'rgba(200,240,74,0.1)', color: '#c8f04a' },
    iconBg: { background: 'rgba(200,240,74,0.1)', border: '1px solid rgba(200,240,74,0.2)' },
  },
  {
    icon: '🌐',
    title: 'Local Multiplayer',
    desc: 'Challenge a friend on the same device in pass-and-play mode. Two players, one board, pure skill.',
    tag: 'Multiplayer',
    tagColor: { background: 'rgba(126,242,200,0.1)', color: '#7ef2c8' },
    iconBg: { background: 'rgba(126,242,200,0.1)', border: '1px solid rgba(126,242,200,0.2)' },
  },
  {
    icon: '🏆',
    title: 'Global Leaderboard',
    desc: 'Compete with players worldwide. Rankings are based on total wins and win rate across all difficulty levels.',
    tag: 'Competitive',
    tagColor: { background: 'rgba(251,191,36,0.1)', color: '#fbbf24' },
    iconBg: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' },
  },
  {
    icon: '📊',
    title: 'Algorithm Visualizer',
    desc: 'Watch the Minimax decision tree unfold in real time as the AI calculates its next move. Understand the algorithm by seeing it work.',
    tag: 'Educational',
    tagColor: { background: 'rgba(160,130,255,0.1)', color: '#a082ff' },
    iconBg: { background: 'rgba(160,130,255,0.1)', border: '1px solid rgba(160,130,255,0.2)' },
  },
  {
    icon: '📈',
    title: 'Game Analytics',
    desc: 'Detailed match history, win/loss/draw breakdowns per difficulty level. See exactly where each game was won or lost.',
    tag: 'Insights',
    tagColor: { background: 'rgba(255,160,80,0.1)', color: '#ffa050' },
    iconBg: { background: 'rgba(255,160,80,0.1)', border: '1px solid rgba(255,160,80,0.2)' },
  },
  {
    icon: '🎨',
    title: 'Theme & Accessibility',
    desc: 'Dark mode, custom board styles, sound effects, full keyboard navigation, and screen reader support out of the box.',
    tag: 'Inclusive',
    tagColor: { background: 'rgba(255,100,180,0.1)', color: '#ff64b4' },
    iconBg: { background: 'rgba(255,100,180,0.1)', border: '1px solid rgba(255,100,180,0.2)' },
  },
]

export default function Features() {
  const cardsRef = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" style={{ padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      <div style={{ marginBottom: '4rem' }}>
        <p style={{ color: '#c8f04a', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Core Features
        </p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem' }}>
          Everything you need<br />to play and learn
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 300, maxWidth: '480px', lineHeight: 1.7 }}>
          From a perfectly optimal AI to local multiplayer, a global leaderboard, and a live algorithm visualizer.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {features.map((f, index) => (
          <div
            key={f.title}
            ref={(el) => (cardsRef.current[index] = el)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px', padding: '1.75rem',
              opacity: 0, transform: 'translateY(30px)',
              transition: `opacity 0.6s ease ${index * 100}ms, transform 0.6s ease ${index * 100}ms`,
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '1.25rem', ...f.iconBg }}>
              {f.icon}
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, color: 'white', fontSize: '1rem', marginBottom: '0.5rem' }}>
              {f.title}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 300, marginBottom: '1rem' }}>
              {f.desc}
            </p>
            <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 500, padding: '0.25rem 0.6rem', borderRadius: '6px', ...f.tagColor }}>
              {f.tag}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}