import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Board from './Board'
import { checkWinner, getBestMove } from './minimax'

const difficulties = ['easy', 'medium', 'hard']

export default function Game() {
  const navigate = useNavigate()

  const [difficulty, setDifficulty] = useState(null)
  const [playerSign, setPlayerSign] = useState(null)
  const [setupStep, setSetupStep] = useState('difficulty')
  const [pendingDifficulty, setPendingDifficulty] = useState(null)
  const [showWarning, setShowWarning] = useState(false)

  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [result, setResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [scores, setScores] = useState({ player: 0, ai: 0, draw: 0 })

  // Track whose turn starts each round — cycles X then O then X...
  const roundRef = useRef(0)

  const aiSign = playerSign === 'X' ? 'O' : 'X'

  // Who has the current turn
  const currentTurnSign = xIsNext ? 'X' : 'O'
  const isPlayerTurn = currentTurnSign === playerSign

  // AI move effect
  useEffect(() => {
    if (setupStep !== 'game') return
    if (result) return

    const res = checkWinner(board)
    if (res) {
      setResult(res)
      if (res.winner === 'draw') {
        setScores(prev => ({ ...prev, draw: prev.draw + 1 }))
      } else if (res.winner === playerSign) {
        setScores(prev => ({ ...prev, player: prev.player + 1 }))
      } else {
        setScores(prev => ({ ...prev, ai: prev.ai + 1 }))
      }
      return
    }

    if (!isPlayerTurn && !thinking) {
      setThinking(true)
      const timer = setTimeout(() => {
        const boardCopy = [...board]
        const move = getBestMove(boardCopy, difficulty, aiSign)
        if (move !== null && move !== undefined) {
          boardCopy[move] = aiSign
          setBoard(boardCopy)
          setXIsNext(prev => !prev)
        }
        setThinking(false)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [board, isPlayerTurn, setupStep, result])

  const handleCellClick = (i) => {
    if (board[i] || !isPlayerTurn || result || thinking) return
    const newBoard = [...board]
    newBoard[i] = playerSign
    setBoard(newBoard)
    setXIsNext(prev => !prev)
  }

  const resetGame = () => {
    // Cycle who starts: round 0 → X starts, round 1 → O starts, round 2 → X starts...
    roundRef.current += 1
    const xStarts = roundRef.current % 2 === 0
    setBoard(Array(9).fill(null))
    setResult(null)
    setThinking(false)
    setXIsNext(xStarts)
  }

  const handleDifficultyClick = (d) => {
    if (d === difficulty) return
    setPendingDifficulty(d)
    setShowWarning(true)
  }

  const confirmDifficultyChange = () => {
    roundRef.current = 0
    setDifficulty(pendingDifficulty)
    setPlayerSign(null)
    setBoard(Array(9).fill(null))
    setResult(null)
    setThinking(false)
    setXIsNext(true)
    setScores({ player: 0, ai: 0, draw: 0 })
    setSetupStep('sign')
    setShowWarning(false)
    setPendingDifficulty(null)
  }

  const cancelDifficultyChange = () => {
    setShowWarning(false)
    setPendingDifficulty(null)
  }

  const getStatus = () => {
    if (thinking) return `AI is thinking...`
    if (result) {
      if (result.winner === 'draw') return "It's a Draw!"
      if (result.winner === playerSign) return 'You Win! 🎉'
      return 'AI Wins!'
    }
    if (isPlayerTurn) return `Your Turn (${playerSign})`
    return `AI's Turn (${aiSign})`
  }

  const getStatusColor = () => {
    if (!result) return 'white'
    if (result.winner === 'draw') return '#fbbf24'
    if (result.winner === playerSign) return '#c8f04a'
    return '#7ef2c8'
  }

  // ── DIFFICULTY SCREEN ──
  if (setupStep === 'difficulty') {
    return (
      <div style={screenStyle}>
        <BackButton navigate={navigate} />
        <Logo />
        <p style={sectionLabel}>Step 1 of 2</p>
        <h2 style={headingStyle}>Choose Difficulty</h2>
        <p style={subStyle}>Sets the AI skill level for the entire session.</p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '340px',
          marginTop: '2rem'
        }}>
          {[
            { key: 'easy', label: 'Easy', desc: 'AI plays randomly — you will win', color: '#7ef2c8' },
            { key: 'medium', label: 'Medium', desc: 'Balanced — anyone can win', color: '#fbbf24' },
            { key: 'hard', label: 'Hard', desc: 'Full Minimax — AI never loses', color: '#c8f04a' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => { setDifficulty(d.key); setSetupStep('sign') }}
              style={diffBtnStyle}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = d.color
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'white',
                  marginBottom: '3px'
                }}>
                  {d.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                  {d.desc}
                </div>
              </div>
              <span style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: d.color,
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>
                {d.key}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── SIGN SCREEN ──
  if (setupStep === 'sign') {
    return (
      <div style={screenStyle}>
        <BackButton navigate={navigate} />
        <Logo />
        <p style={sectionLabel}>Step 2 of 2</p>
        <h2 style={headingStyle}>Pick Your Sign</h2>
        <p style={subStyle}>X always goes first. Pick O and the AI starts.</p>
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem' }}>
          {[
            { sign: 'X', color: '#c8f04a', label: 'You go first' },
            { sign: 'O', color: '#7ef2c8', label: 'AI goes first' },
          ].map(s => (
            <button
              key={s.sign}
              onClick={() => {
                setPlayerSign(s.sign)
                roundRef.current = 0
                setXIsNext(true)
                setSetupStep('game')
              }}
              style={signBtnStyle}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = s.color
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.4)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                {s.sign === 'X'
                  ? <svg width="56" height="56" viewBox="0 0 52 52" fill="none">
                      <line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5.5" strokeLinecap="round" />
                      <line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5.5" strokeLinecap="round" />
                    </svg>
                  : <svg width="56" height="56" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5.5" />
                    </svg>
                }
              </div>
              <span style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                color: s.color,
              }}>
                {s.sign}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── GAME SCREEN ──
  return (
    <div style={screenStyle}>
      <BackButton navigate={navigate} />

      {/* Warning modal */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            background: '#0d1220',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '2.5rem',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              margin: '0 auto 1.25rem',
            }}>⚠️</div>
            <h3 style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '1.2rem',
              color: 'white',
              marginBottom: '0.75rem',
            }}>Change Difficulty?</h3>
            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.875rem',
              lineHeight: 1.65,
              marginBottom: '2rem',
            }}>
              Switching to{' '}
              <strong style={{ color: '#c8f04a' }}>{pendingDifficulty}</strong>
              {' '}will reset all scores and ask you to pick your sign again.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={cancelDifficultyChange}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.9rem',
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                Cancel
              </button>
              <button
                onClick={confirmDifficultyChange}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#c8f04a',
                  color: '#060912',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#d4f55e'}
                onMouseLeave={e => e.currentTarget.style.background = '#c8f04a'}
              >
                Yes, Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <Logo />

      {/* Difficulty tabs */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        marginBottom: '1.5rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '4px',
      }}>
        {difficulties.map(d => (
          <button
            key={d}
            onClick={() => handleDifficultyClick(d)}
            style={{
              padding: '0.4rem 1.1rem',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
              background: difficulty === d ? '#c8f04a' : 'transparent',
              color: difficulty === d ? '#060912' : 'rgba(255,255,255,0.4)',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Scoreboard */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '6px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {[
          { label: `You (${playerSign})`, value: scores.player, color: '#c8f04a', active: isPlayerTurn && !result },
          { label: 'Draw', value: scores.draw, color: '#fbbf24', active: false },
          { label: `AI (${aiSign})`, value: scores.ai, color: '#7ef2c8', active: !isPlayerTurn && !result && !thinking },
        ].map(s => (
          <div key={s.label} style={{
            background: s.active
              ? 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
              : 'transparent',
            border: s.active
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid transparent',
            borderRadius: '11px',
            padding: '0.85rem 1.1rem',
            textAlign: 'center',
            minWidth: '85px',
            transition: 'all 0.3s ease',
            boxShadow: s.active
              ? '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)'
              : 'none',
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              color: s.color,
              lineHeight: 1,
              marginBottom: '4px',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.65rem',
              color: s.active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Turn indicator */}
      <div style={{
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '0.5rem 1.25rem',
      }}>
        {thinking
          ? <>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#7ef2c8', display: 'inline-block',
                animation: 'pulse 1s infinite',
              }} />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                AI is thinking...
              </span>
            </>
          : result
          ? <span style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              color: getStatusColor(),
            }}>
              {getStatus()}
            </span>
          : <>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: isPlayerTurn ? '#c8f04a' : '#7ef2c8',
                display: 'inline-block',
              }} />
              <span style={{
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {isPlayerTurn ? `Your turn` : `AI's turn`}
              </span>
              <span style={{
                marginLeft: '4px',
                fontSize: '0.75rem',
                color: isPlayerTurn ? '#c8f04a' : '#7ef2c8',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
              }}>
                ({currentTurnSign})
              </span>
            </>
        }
      </div>

      {/* Board */}
      <Board board={board} onCellClick={handleCellClick} winLine={result?.line} />

      {/* Round info */}
      <p style={{
        marginTop: '1rem',
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Round {roundRef.current + 1} · {difficulty} mode
      </p>

      {/* Play again */}
      {result && (
        <button
          onClick={resetGame}
          style={{
            marginTop: '1.5rem',
            background: '#c8f04a',
            color: '#060912',
            border: 'none',
            padding: '0.85rem 2.5rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s',
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.75); }
        }
      `}</style>
    </div>
  )
}

// ── Styles ──
const screenStyle = {
  background: '#060912',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  fontFamily: 'DM Sans, sans-serif',
  position: 'relative',
}

const headingStyle = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
  color: 'white',
  letterSpacing: '-0.02em',
  marginBottom: '0.5rem',
  textAlign: 'center',
}

const subStyle = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.9rem',
  textAlign: 'center',
  maxWidth: '320px',
  lineHeight: 1.6,
}

const sectionLabel = {
  color: '#c8f04a',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.5rem',
}

const diffBtnStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '1.1rem 1.25rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: 'white',
  transition: 'all 0.2s',
  width: '100%',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
}

const signBtnStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '2rem 2.5rem',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  transition: 'all 0.25s',
  minWidth: '130px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
}

function BackButton({ navigate }) {
  return (
    <button
      onClick={() => navigate('/')}
      style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.5)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
      }}
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
  )
}

function Logo() {
  return (
    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
      <h1 style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: '1.4rem',
        color: 'white',
        letterSpacing: '-0.02em',
        marginBottom: '0.2rem',
      }}>TTT-AI</h1>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
        Tic Tac Toe vs AI
      </p>
    </div>
  )
}