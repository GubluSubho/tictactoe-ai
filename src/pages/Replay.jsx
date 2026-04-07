import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, get } from 'firebase/database'
import { db } from '../firebase'
import { getRank } from '../utils/elo'

const checkWinnerDynamic = (board, size, winLength) => {
  const getCell = (r, c) => r >= 0 && r < size && c >= 0 && c < size ? board[r * size + c] : null
  const directions = [[0,1],[1,0],[1,1],[1,-1]]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = getCell(r, c)
      if (!cell) continue
      for (const [dr, dc] of directions) {
        let count = 1; const line = [[r, c]]
        while (count < winLength) {
          const nr = r + dr * count, nc = c + dc * count
          if (getCell(nr, nc) !== cell) break
          line.push([nr, nc]); count++
        }
        if (count >= winLength) return { winner: cell, line: line.map(([lr, lc]) => lr * size + lc) }
      }
    }
  }
  if (board.every(c => c !== null)) return { winner: 'draw', line: [] }
  return null
}

export default function Replay() {
  const navigate = useNavigate()
  const { roomId } = useParams()

  const [replay, setReplay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const intervalRef = useRef(null)

  useEffect(() => {
    get(ref(db, `replays/${roomId}`)).then(snap => {
      if (snap.exists()) setReplay(snap.val())
      setLoading(false)
    })
  }, [roomId])

  useEffect(() => {
    if (playing && replay) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= replay.moves.length) { setPlaying(false); clearInterval(intervalRef.current); return s }
          return s + 1
        })
      }, speed)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed, replay])

  if (loading) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a082ff', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  )

  if (!replay) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Replay not found.</p>
      <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Back to Lobby</button>
    </div>
  )

  const { boardSize, winLength, players, moves, result } = replay

  // Build board at current step
  const currentBoard = Array(boardSize * boardSize).fill(null)
  for (let i = 0; i < step && i < moves.length; i++) {
    currentBoard[moves[i].index] = moves[i].sign
  }
  const currentResult = step >= moves.length ? result : checkWinnerDynamic(currentBoard, boardSize, winLength)
  const cellSize = Math.max(36, Math.min(72, Math.floor(300 / boardSize)))
  const lastMove = step > 0 ? moves[step - 1]?.index : null
  const xRank = getRank(players?.X?.elo || 1000)
  const oRank = getRank(players?.O?.elo || 1000)

  return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>

      <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: '#a082ff', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Game Replay</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.75rem', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>
          {players?.X?.username} vs {players?.O?.username}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>
          {boardSize}×{boardSize} · Room #{roomId}
        </p>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { sign: 'X', data: players?.X, rank: xRank, eloChange: replay.xEloChange },
          { sign: 'O', data: players?.O, rank: oRank, eloChange: replay.oEloChange },
        ].map(p => (
          <div key={p.sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.65rem 1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.15)`, border: `1px solid rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: p.sign === 'X' ? '#c8f04a' : '#7ef2c8' }}>
              {p.data?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{p.data?.username}</div>
              <div style={{ fontSize: '0.65rem', color: p.rank.color }}>{p.rank.icon} {p.rank.title} · {p.data?.elo || 1000} ELO</div>
              {p.eloChange !== undefined && (
                <div style={{ fontSize: '0.65rem', color: p.eloChange >= 0 ? '#c8f04a' : '#ef4444', fontWeight: 600 }}>
                  {p.eloChange >= 0 ? '+' : ''}{p.eloChange} ELO
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Move counter */}
      <div style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif' }}>
        Move {step} of {moves.length}
        {currentResult && step >= moves.length && (
          <span style={{ marginLeft: '8px', color: currentResult.winner === 'draw' ? '#fbbf24' : '#c8f04a', fontWeight: 600 }}>
            · {currentResult.winner === 'draw' ? "Draw!" : `${players?.[currentResult.winner]?.username} Won!`}
          </span>
        )}
      </div>

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`, gap: '4px', padding: '12px', background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.4)', marginBottom: '1.5rem' }}>
        {currentBoard.map((cell, i) => {
          const isWin = currentResult?.line?.includes(i)
          const isLast = i === lastMove
          return (
            <div key={i} style={{ width: `${cellSize}px`, height: `${cellSize}px`, borderRadius: Math.max(4, cellSize / 8) + 'px', border: isWin ? '1.5px solid rgba(200,240,74,0.4)' : isLast ? '1.5px solid rgba(160,130,255,0.4)' : '1px solid rgba(255,255,255,0.07)', background: isWin ? 'rgba(200,240,74,0.08)' : isLast ? 'rgba(160,130,255,0.08)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', transform: isWin ? 'scale(1.04)' : 'scale(1)' }}>
              {cell === 'X' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/><line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/></svg>}
              {cell === 'O' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5"/></svg>}
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
        <button onClick={() => { setStep(0); setPlaying(false) }} style={ctrlBtn}>⏮</button>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} style={ctrlBtn}>◀</button>
        <button onClick={() => { if (step >= moves.length) setStep(0); setPlaying(p => !p) }} style={{ ...ctrlBtn, background: playing ? 'rgba(239,68,68,0.1)' : 'rgba(200,240,74,0.1)', borderColor: playing ? 'rgba(239,68,68,0.3)' : 'rgba(200,240,74,0.3)', color: playing ? '#ef4444' : '#c8f04a', minWidth: '60px' }}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => setStep(s => Math.min(moves.length, s + 1))} style={ctrlBtn}>▶</button>
        <button onClick={() => { setStep(moves.length); setPlaying(false) }} style={ctrlBtn}>⏭</button>
      </div>

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Speed:</span>
        {[{ label: '0.5×', val: 2000 }, { label: '1×', val: 1000 }, { label: '2×', val: 500 }, { label: '3×', val: 333 }].map(s => (
          <button key={s.val} onClick={() => setSpeed(s.val)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s', background: speed === s.val ? '#c8f04a' : 'rgba(255,255,255,0.06)', color: speed === s.val ? '#060912' : 'rgba(255,255,255,0.4)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '340px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#a082ff', borderRadius: '2px', width: `${moves.length > 0 ? (step / moves.length) * 100 : 0}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

const ctrlBtn = { width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }