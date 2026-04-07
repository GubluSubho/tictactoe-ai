import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set, get, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10]

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function OnlineMultiplayer() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab] = useState('create')
  const [boardSize, setBoardSize] = useState(3)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdRoom, setCreatedRoom] = useState(null)

  const getUsername = async () => {
    const snap = await get(ref(db, `users/${user.uid}`))
    return snap.exists() ? snap.val().username : user.displayName || 'Player'
  }

  const createRoom = async () => {
    setError('')
    setLoading(true)
    try {
      const username = await getUsername()
      const roomId = generateRoomCode()
      const winLength = boardSize >= 5 ? 5 : boardSize
      await set(ref(db, `rooms/${roomId}`), {
        boardSize, winLength,
        board: Array(boardSize * boardSize).fill(null),
        status: 'waiting',
        players: {
          X: { uid: user.uid, username },
        },
        xIsNext: true,
        createdAt: Date.now(),
      })
      setCreatedRoom(roomId)

      // Wait for opponent
      const roomRef = ref(db, `rooms/${roomId}`)
      const unsub = onValue(roomRef, (snap) => {
        const data = snap.val()
        if (data?.status === 'playing') {
          unsub()
          navigate(`/online/${roomId}`)
        }
      })
    } catch (err) {
      setError('Failed to create room. Try again.')
    }
    setLoading(false)
  }

  const joinRoom = async () => {
    setError('')
    if (!joinCode.trim()) return setError('Please enter a room code.')
    setLoading(true)
    try {
      const username = await getUsername()
      const code = joinCode.trim().toUpperCase()
      const snap = await get(ref(db, `rooms/${code}`))
      if (!snap.exists()) { setLoading(false); return setError('Room not found. Check the code and try again.') }
      const room = snap.val()
      if (room.status !== 'waiting') { setLoading(false); return setError('This room has already started or finished.') }
      if (room.players?.X?.uid === user.uid) { setLoading(false); return setError("You can't join your own room.") }

      await set(ref(db, `rooms/${code}/players/O`), { uid: user.uid, username })
      await set(ref(db, `rooms/${code}/status`), 'playing')
      navigate(`/online/${code}`)
    } catch (err) {
      setError('Failed to join room. Try again.')
    }
    setLoading(false)
  }

  return (
    <div style={screenStyle}>
      <button
        onClick={() => navigate('/select')}
        style={backBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
      >
        ← Back
      </button>

      <div style={{ position: 'fixed', width: '500px', height: '500px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Online Battle</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>Play Online</h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 }}>Create a room or join a friend's room with a code</p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '2rem', width: '100%', maxWidth: '380px' }}>
        {['create', 'join'].map(t => (
          <button key={t} onClick={() => { setTab(t); setError(''); setCreatedRoom(null) }} style={{
            flex: 1, padding: '0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.25s ease',
            background: tab === t ? '#c8f04a' : 'transparent',
            color: tab === t ? '#060912' : 'rgba(255,255,255,0.4)',
          }}>
            {t === 'create' ? '+ Create Room' : '→ Join Room'}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '380px' }}>

        {tab === 'create' && !createdRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>
                Board Size
                <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: '6px', fontSize: '0.68rem' }}>
                  win condition: {boardSize >= 5 ? '5' : boardSize} in a row
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                {BOARD_SIZES.map(s => (
                  <button key={s} onClick={() => setBoardSize(s)} style={{
                    padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                    background: boardSize === s ? '#c8f04a' : 'rgba(255,255,255,0.04)',
                    color: boardSize === s ? '#060912' : 'rgba(255,255,255,0.5)',
                    border: boardSize === s ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {s}×{s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', margin: '8px 0 0' }}>
                {boardSize === 3 && 'Classic Tic Tac Toe — 3 in a row to win'}
                {boardSize === 4 && '4×4 board — 4 in a row to win'}
                {boardSize === 5 && '5×5 board — 5 in a row to win'}
                {boardSize > 5 && `${boardSize}×${boardSize} board — 5 in a row to win`}
              </p>
            </div>

            {error && <ErrorBox msg={error} />}

            <button
              onClick={createRoom}
              disabled={loading}
              style={{
                background: loading ? 'rgba(251,191,36,0.5)' : '#fbbf24',
                color: '#060912', border: 'none', padding: '0.9rem',
                borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease', boxShadow: '0 8px 24px rgba(251,191,36,0.2)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#fcd34d'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fbbf24'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? 'Creating...' : `Create ${boardSize}×${boardSize} Room →`}
            </button>
          </div>
        )}

        {tab === 'create' && createdRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{
              background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '20px', padding: '2rem', textAlign: 'center', width: '100%',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 1rem' }}>Share this room code with your opponent</p>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '2.5rem', color: '#fbbf24', letterSpacing: '0.15em',
                marginBottom: '1rem',
              }}>
                {createdRoom}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdRoom)
                }}
                style={{
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                  color: '#fbbf24', padding: '0.5rem 1.25rem', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.1)'}
              >
                📋 Copy Code
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              Waiting for opponent to join...
            </div>

            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Board: {boardSize}×{boardSize} · Win: {boardSize >= 5 ? 5 : boardSize} in a row
            </p>
          </div>
        )}

        {tab === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Room Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code..."
                value={joinCode}
                maxLength={6}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
                style={{
                  ...inputStyle,
                  fontSize: '1.5rem', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, textAlign: 'center', letterSpacing: '0.2em',
                  padding: '1rem',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
              />
            </div>

            {error && <ErrorBox msg={error} />}

            <button
              onClick={joinRoom}
              disabled={loading}
              style={{
                background: loading ? 'rgba(126,242,200,0.5)' : '#7ef2c8',
                color: '#060912', border: 'none', padding: '0.9rem',
                borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease', boxShadow: '0 8px 24px rgba(126,242,200,0.15)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#a7f3d0'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#7ef2c8'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? 'Joining...' : 'Join Room →'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.75)} }
      `}</style>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>⚠</span><span>{msg}</span>
    </div>
  )
}

const screenStyle = { background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }
const backBtnStyle = { position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }
const labelStyle = { display: 'block', fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', fontWeight: 500, letterSpacing: '0.02em' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' }