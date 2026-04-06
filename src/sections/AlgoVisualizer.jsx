import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef } from 'react'

const DEMO_BOARDS = [
  {
    board: ['X', 'O', 'X', null, 'O', null, null, null, null],
    score: '+7', color: '#c8f04a', label: 'AI evaluates this position',
  },
  {
    board: ['X', 'O', 'X', 'O', 'O', null, null, null, null],
    score: '-3', color: '#ef4444', label: 'Risky for AI',
  },
  {
    board: ['X', 'O', 'X', null, 'O', null, 'O', null, null],
    score: '+9', color: '#c8f04a', label: 'Best AI move found',
  },
]

function DemoBoard({ board, score, color, label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: '3px', width: '72px', height: '72px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}30`,
        borderRadius: '10px', padding: '4px',
      }}>
        {board.map((cell, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '3px',
            background: !cell ? 'rgba(255,255,255,0.02)' : 'transparent',
            fontSize: '11px', fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            color: cell === 'X' ? '#c8f04a' : cell === 'O' ? '#7ef2c8' : 'rgba(255,255,255,0.1)',
          }}>
            {cell || '·'}
          </div>
        ))}
      </div>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '0.85rem', color,
        background: `rgba(${color === '#c8f04a' ? '200,240,74' : '239,68,68'},0.08)`,
        border: `1px solid rgba(${color === '#c8f04a' ? '200,240,74' : '239,68,68'},0.2)`,
        padding: '2px 10px', borderRadius: '6px',
      }}>
        {score}
      </div>
      <p style={{
        fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)',
        textAlign: 'center', margin: 0, maxWidth: '80px', lineHeight: 1.4,
      }}>
        {label}
      </p>
    </div>
  )
}

export default function AlgoVisualizer() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section style={{
      padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto',
    }}>
      <div
        ref={sectionRef}
        style={{
          background: 'linear-gradient(145deg, rgba(160,130,255,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(160,130,255,0.15)',
          borderRadius: '28px',
          padding: '3.5rem 3rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
          opacity: 0,
          transform: 'translateY(40px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Left — text */}
        <div>
          <p style={{
            color: '#a082ff', fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            Educational Feature
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: 'white',
            letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1.25rem',
          }}>
            Watch the AI<br />
            <span style={{ color: '#a082ff' }}>think in real time</span>
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem',
            lineHeight: 1.75, marginBottom: '2rem', fontWeight: 300,
          }}>
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
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(user ? '/visualizer' : '/auth')}
            style={{
              background: '#a082ff', color: 'white', border: 'none',
              padding: '0.9rem 2rem', borderRadius: '12px',
              fontSize: '0.95rem', fontWeight: 700,
              fontFamily: 'Syne, sans-serif', cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(160,130,255,0.25)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#b499ff'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(160,130,255,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#a082ff'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(160,130,255,0.25)'
            }}
          >
            📊 &nbsp;Try the Visualizer
          </button>
        </div>

        {/* Right — demo visualization */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
        }}>
          {/* Tree demo */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px', padding: '1.5rem',
            width: '100%',
          }}>
            <p style={{
              fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              margin: '0 0 1.25rem', textAlign: 'center', fontWeight: 600,
            }}>
              Sample Decision Tree
            </p>

            {/* Root node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
              <DemoBoard {...DEMO_BOARDS[0]} />

              {/* Connector */}
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ width: '180px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />

              {/* Children */}
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {DEMO_BOARDS.slice(1).map((b, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
                    <DemoBoard {...b} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: '0.75rem', width: '100%',
          }}>
            {[
              { num: '255', label: 'Max nodes', color: '#a082ff' },
              { num: 'α-β', label: 'Pruning', color: '#7ef2c8' },
              { num: '∞', label: 'Depth search', color: '#c8f04a' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '0.85rem 0.5rem',
              }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '1.2rem', color: s.color, lineHeight: 1, marginBottom: '4px',
                }}>
                  {s.num}
                </div>
                <div style={{
                  fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}