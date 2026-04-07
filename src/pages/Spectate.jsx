import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, onValue, set, remove } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { getRank } from '../utils/elo'

export default function Spectate() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { user } = useAuth()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [spectatorCount, setSpectatorCount] = useState(0)

  useEffect(() => {
    // Register as spectator
    const mySpectRef = ref(db, `rooms/${roomId}/spectators/${user.uid}`)
    set(mySpectRef, { uid: user.uid, joinedAt: Date.now() })

    const roomRef = ref(db, `rooms/${roomId}`)
    const unsub = onValue(roomRef, snap => {
      if (!snap.exists()) { setLoading(false); return }
      const data = snap.val()
      setRoom(data)
      setSpectatorCount(data.spectators ? Object.keys(data.spectators).length : 0)
      setLoading(false)
    })

    return () => {
      unsub()
      remove(mySpectRef)
    }
  }, [roomId, user.uid])

  if (loading) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7ef2c8', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  )

  if (!room) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Room not found or has ended.</p>
      <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Back to Lobby</button>
    </div>
  )

  const { board, boardSize, winLength, status, xIsNext, players, result } = room
  const cellSize = Math.max(36, Math.min(72, Math.floor(300 / boardSize)))
  const currentSign = xIsNext ? 'X' : 'O'
  const xRank = getRank(players?.X?.elo || 1000)
  const oRank = getRank(players?.O?.elo || 1000)

  return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>

      <button onClick={() => navigate('/online')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
        ← Leave
      </button>

      {/* Spectator badge */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(126,242,200,0.08)', border: '1px solid rgba(126,242,200,0.2)', borderRadius: '8px', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7ef2c8', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: '0.75rem', color: '#7ef2c8', fontWeight: 600 }}>Spectating · {spectatorCount} watching</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <p style={{ color: '#7ef2c8', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Live Game</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>
          {players?.X?.username || '?'} vs {players?.O?.username || 'Waiting...'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', margin: 0 }}>
          Room #{roomId} · {boardSize}×{boardSize}
        </p>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { sign: 'X', data: players?.X, rank: xRank, active: xIsNext && status === 'playing' },
          { sign: 'O', data: players?.O, rank: oRank, active: !xIsNext && status === 'playing' },
        ].map(p => (
          <div key={p.sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: p.active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '0.6rem 1rem', transition: 'all 0.3s ease', minWidth: '130px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.15)`, border: `1px solid rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: p.sign === 'X' ? '#c8f04a' : '#7ef2c8' }}>
              {p.data?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{p.data?.username || (status === 'waiting' ? 'Waiting...' : '?')}</div>
              <div style={{ fontSize: '0.65rem', color: p.rank.color }}>{p.rank.icon} {p.rank.title} · {p.data?.elo || 1000}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.5rem 1.25rem' }}>
        {status === 'playing' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: currentSign === 'X' ? '#c8f04a' : '#7ef2c8', display: 'inline-block', animation: 'pulse 1s infinite' }} />}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: 'white' }}>
          {status === 'waiting' && 'Waiting for players...'}
          {status === 'playing' && `${players?.[currentSign]?.username || currentSign}'s Turn (${currentSign})`}
          {status === 'finished' && (result?.winner === 'draw' ? "It's a Draw!" : `${players?.[result?.winner]?.username} Wins! 🎉`)}
        </span>
      </div>

      {/* Board — read only */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`, gap: '4px', padding: '12px', background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
        {board.map((cell, i) => {
          const isWin = result?.line?.includes(i)
          return (
            <div key={i} style={{ width: `${cellSize}px`, height: `${cellSize}px`, borderRadius: Math.max(4, cellSize / 8) + 'px', border: isWin ? '1.5px solid rgba(200,240,74,0.4)' : '1px solid rgba(255,255,255,0.07)', background: isWin ? 'rgba(200,240,74,0.08)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', transform: isWin ? 'scale(1.04)' : 'scale(1)' }}>
              {cell === 'X' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/><line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/></svg>}
              {cell === 'O' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5"/></svg>}
            </div>
          )
        })}
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
        {boardSize}×{boardSize} · {winLength} in a row to win
      </p>

      {status === 'finished' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => navigate(`/replay/${roomId}`)} style={{ background: 'rgba(160,130,255,0.1)', border: '1px solid rgba(160,130,255,0.2)', color: '#a082ff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,130,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(160,130,255,0.1)'}>
            📽 Watch Replay
          </button>
          <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#d4f55e'}
            onMouseLeave={e => e.currentTarget.style.background = '#c8f04a'}>
            Play →
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.75)}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}
      `}</style>
    </div>
  )
}