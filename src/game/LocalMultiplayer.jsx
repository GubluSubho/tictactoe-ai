import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkWinner } from './minimax'

export default function LocalMultiplayer() {
  const navigate = useNavigate()

  const [setupStep, setSetupStep] = useState('names')
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [nameError, setNameError] = useState('')

  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState({ p1: 0, p2: 0, draw: 0 })

  const roundRef = useRef(0)

  const currentPlayer = xIsNext ? player1 : player2
  const currentSign = xIsNext ? 'X' : 'O'

  const handleNameSubmit = () => {
    setNameError('')
    if (!player1.trim()) return setNameError('Please enter Player 1 name.')
    if (!player2.trim()) return setNameError('Please enter Player 2 name.')
    if (player1.trim().toLowerCase() === player2.trim().toLowerCase()) {
      return setNameError('Player names must be different.')
    }
    setSetupStep('game')
  }

  const handleCellClick = (i) => {
    if (board[i] || result) return
    const newBoard = [...board]
    newBoard[i] = currentSign
    setBoard(newBoard)

    const res = checkWinner(newBoard)
    if (res) {
      setResult(res)
      if (res.winner === 'draw') {
        setScores(prev => ({ ...prev, draw: prev.draw + 1 }))
      } else if (res.winner === 'X') {
        setScores(prev => ({ ...prev, p1: prev.p1 + 1 }))
      } else {
        setScores(prev => ({ ...prev, p2: prev.p2 + 1 }))
      }
    } else {
      setXIsNext(prev => !prev)
    }
  }

  const resetGame = () => {
    roundRef.current += 1
    setXIsNext(roundRef.current % 2 === 0)
    setBoard(Array(9).fill(null))
    setResult(null)
  }

  const resetAll = () => {
    roundRef.current = 0
    setBoard(Array(9).fill(null))
    setResult(null)
    setScores({ p1: 0, p2: 0, draw: 0 })
    setXIsNext(true)
    setSetupStep('names')
    setPlayer1('')
    setPlayer2('')
  }

  const getStatusText = () => {
    if (result) {
      if (result.winner === 'draw') return "It's a Draw!"
      if (result.winner === 'X') return `${player1} Wins! 🎉`
      return `${player2} Wins! 🎉`
    }
    return `${currentPlayer}'s Turn (${currentSign})`
  }

  const getStatusColor = () => {
    if (!result) return 'white'
    if (result.winner === 'draw') return '#fbbf24'
    return '#c8f04a'
  }

  // ── NAME SETUP SCREEN ──
  if (setupStep === 'names') {
    return (
      <div style={screenStyle}>
        <button
          onClick={() => navigate('/select')}
          style={backBtnStyle}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
          }}
        >
          ← Back
        </button>

        <Logo />

        <p style={sectionLabel}>Local Multiplayer</p>
        <h2 style={headingStyle}>Enter Player Names</h2>
        <p style={subStyle}>Two players, one device. No AI involved.</p>

        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: '1rem', width: '100%',
          maxWidth: '320px', marginTop: '2rem',
        }}>
          <div>
            <label style={labelStyle}>
              Player 1
              <span style={{ color: '#c8f04a', marginLeft: '6px', fontSize: '0.7rem' }}>
                · plays X · goes first
              </span>
            </label>
            <input
              type="text"
              placeholder="Enter name..."
              value={player1}
              maxLength={20}
              onChange={e => setPlayer1(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                e.target.style.background = 'rgba(255,255,255,0.06)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                e.target.style.background = 'rgba(255,255,255,0.03)'
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Player 2
              <span style={{ color: '#7ef2c8', marginLeft: '6px', fontSize: '0.7rem' }}>
                · plays O
              </span>
            </label>
            <input
              type="text"
              placeholder="Enter name..."
              value={player2}
              maxLength={20}
              onChange={e => setPlayer2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(126,242,200,0.4)'
                e.target.style.background = 'rgba(255,255,255,0.06)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                e.target.style.background = 'rgba(255,255,255,0.03)'
              }}
            />
          </div>

          {nameError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px', padding: '0.65rem 1rem',
              fontSize: '0.8rem', color: '#f87171',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠</span> {nameError}
            </div>
          )}

          <button
            onClick={handleNameSubmit}
            style={{
              background: '#c8f04a', color: '#060912',
              border: 'none', padding: '0.9rem',
              borderRadius: '12px', fontSize: '0.95rem',
              fontWeight: 700, fontFamily: 'Syne, sans-serif',
              cursor: 'pointer', transition: 'all 0.2s ease',
              marginTop: '0.5rem',
              boxShadow: '0 8px 24px rgba(200,240,74,0.2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#d4f55e'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(200,240,74,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#c8f04a'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,240,74,0.2)'
            }}
          >
            Start Game →
          </button>
        </div>
      </div>
    )
  }

  // ── GAME SCREEN ──
  return (
    <div style={screenStyle}>

      {/* Back to mode select */}
      <button
        onClick={() => navigate('/select')}
        style={backBtnStyle}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
        }}
      >
        ← Back
      </button>

      {/* Reset all scores */}
      <button
        onClick={resetAll}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
          padding: '0.5rem 1rem', borderRadius: '8px',
          cursor: 'pointer', fontSize: '0.78rem',
          transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
          e.currentTarget.style.color = '#ef4444'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
        }}
      >
        ↺ Reset All
      </button>

      <Logo />

      {/* Scoreboard */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '6px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        width: '100%', maxWidth: '360px',
      }}>
        {[
          { label: player1, sub: '(X)', value: scores.p1, color: '#c8f04a', active: !result && xIsNext },
          { label: 'Draw', sub: '', value: scores.draw, color: '#fbbf24', active: false },
          { label: player2, sub: '(O)', value: scores.p2, color: '#7ef2c8', active: !result && !xIsNext },
        ].map(s => (
          <div key={s.label} style={{
            background: s.active
              ? 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
              : 'transparent',
            border: s.active
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid transparent',
            borderRadius: '11px', padding: '0.85rem 0.75rem',
            textAlign: 'center', flex: 1,
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              fontSize: '1.75rem', fontWeight: 800,
              fontFamily: 'Syne, sans-serif', color: s.color,
              lineHeight: 1, marginBottom: '4px',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.6rem',
              color: s.active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              fontWeight: 500, lineHeight: 1.4,
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', maxWidth: '80px', margin: '0 auto',
            }}>
              {s.label}
              {s.sub && <span style={{ color: s.color, marginLeft: '3px' }}>{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Turn indicator */}
      <div style={{
        marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px', padding: '0.5rem 1.25rem',
        transition: 'all 0.3s ease',
      }}>
        {result ? (
          <span style={{
            fontSize: '0.95rem', fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            color: getStatusColor(),
          }}>
            {getStatusText()}
          </span>
        ) : (
          <>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: xIsNext ? '#c8f04a' : '#7ef2c8',
              display: 'inline-block',
              transition: 'background 0.3s ease',
            }} />
            <span style={{
              fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            }}>
              {currentPlayer}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: xIsNext ? '#c8f04a' : '#7ef2c8',
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              transition: 'color 0.3s ease',
            }}>
              ({currentSign})
            </span>
          </>
        )}
      </div>

      {/* Board */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: '10px', width: '100%', maxWidth: '340px', padding: '14px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {board.map((cell, i) => {
          const isWin = result?.line && result.line.includes(i)
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '14px',
                border: isWin
                  ? '1.5px solid rgba(200,240,74,0.4)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: isWin
                  ? 'linear-gradient(145deg, rgba(200,240,74,0.1), rgba(200,240,74,0.04))'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: cell ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                transform: isWin ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isWin
                  ? '0 8px 24px rgba(200,240,74,0.1), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                if (!cell) {
                  e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                  e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)'
                }
              }}
              onMouseLeave={e => {
                if (!cell) {
                  e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {cell === 'X' && (
                <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
                  <line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round" />
                  <line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round" />
                </svg>
              )}
              {cell === 'O' && (
                <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
                  <circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Round info */}
      <p style={{
        marginTop: '1rem', fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.05em', textTransform: 'uppercase',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Round {roundRef.current + 1} · Local Multiplayer
      </p>

      {/* Play again */}
      {result && (
        <button
          onClick={resetGame}
          style={{
            marginTop: '1.5rem', background: '#c8f04a',
            color: '#060912', border: 'none',
            padding: '0.85rem 2.5rem', borderRadius: '12px',
            fontSize: '1rem', fontWeight: 700,
            fontFamily: 'Syne, sans-serif', cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 24px rgba(200,240,74,0.2)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#d4f55e'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(200,240,74,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#c8f04a'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,240,74,0.2)'
          }}
        >
          Play Again →
        </button>
      )}
    </div>
  )
}

// ── Shared styles ──
const screenStyle = {
  background: '#060912', minHeight: '100vh',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '2rem', fontFamily: 'DM Sans, sans-serif',
  position: 'relative',
}

const backBtnStyle = {
  position: 'absolute', top: '1.5rem', left: '1.5rem',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  padding: '0.5rem 1rem', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
}

const headingStyle = {
  fontFamily: 'Syne, sans-serif', fontWeight: 800,
  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'white',
  letterSpacing: '-0.02em', marginBottom: '0.5rem', textAlign: 'center',
}

const subStyle = {
  color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem',
  textAlign: 'center', maxWidth: '320px', lineHeight: 1.6,
}

const sectionLabel = {
  color: '#7ef2c8', fontSize: '0.72rem', fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem',
}

const labelStyle = {
  display: 'block', fontSize: '0.76rem',
  color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem',
  fontWeight: 500, letterSpacing: '0.02em',
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem',
  borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)', color: 'white',
  fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif',
  outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box',
}

function Logo() {
  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.4rem', color: 'white',
        letterSpacing: '-0.02em', marginBottom: '0.2rem',
      }}>TTT-AI</h1>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
        Local Multiplayer
      </p>
    </div>
  )
}