import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set, get, onValue, push } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const generateBracket = (players) => {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const rounds = []
  let current = shuffled

  while (current.length > 1) {
    const matches = []
    for (let i = 0; i < current.length; i += 2) {
      matches.push({
        player1: current[i],
        player2: current[i + 1] || null,
        winner: current[i + 1] ? null : current[i],
        id: `${rounds.length}-${i}`,
      })
    }
    rounds.push(matches)
    current = matches.map(m => m.winner).filter(Boolean)
    if (current.length <= 1 && rounds[rounds.length - 1].some(m => m.winner === null)) break
  }

  return rounds
}

export default function Tournament() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()

  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
  const [boardSize, setBoardSize] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tournaments, setTournaments] = useState([])
  const [myTournament, setMyTournament] = useState(null)
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (!user) return
    get(ref(db, `users/${user.uid}/username`)).then(snap => {
      if (snap.exists()) setUsername(snap.val())
    })

    const tRef = ref(db, 'tournaments')
    const unsub = onValue(tRef, snap => {
      if (!snap.exists()) { setTournaments([]); return }
      const all = Object.entries(snap.val()).map(([id, t]) => ({ id, ...t }))
      setTournaments(all.filter(t => t.status !== 'finished').slice(0, 10))
    })
    return () => unsub()
  }, [user])

  const createTournament = async () => {
    setError('')
    if (!name.trim()) return setError('Enter a tournament name.')
    setLoading(true)
    try {
      const tRef = push(ref(db, 'tournaments'))
      await set(tRef, {
        name: name.trim(), boardSize,
        host: { uid: user.uid, username },
        players: { [user.uid]: { uid: user.uid, username } },
        status: 'waiting',
        maxPlayers: 8,
        createdAt: Date.now(),
        bracket: null,
      })
      setMyTournament(tRef.key)
      setTab('lobby')

      onValue(ref(db, `tournaments/${tRef.key}`), snap => {
        const data = snap.val()
        if (data) setMyTournament(snap.key)
      })
    } catch {
      setError('Failed to create tournament.')
    }
    setLoading(false)
  }

  const joinTournament = async (tid) => {
    setError('')
    try {
      const snap = await get(ref(db, `tournaments/${tid}`))
      if (!snap.exists()) return setError('Tournament not found.')
      const data = snap.val()
      if (data.status !== 'waiting') return setError('Tournament already started.')
      const playerCount = Object.keys(data.players || {}).length
      if (playerCount >= data.maxPlayers) return setError('Tournament is full.')
      await set(ref(db, `tournaments/${tid}/players/${user.uid}`), { uid: user.uid, username })
      setMyTournament(tid)
      setTab('lobby')
    } catch {
      setError('Failed to join tournament.')
    }
  }

  const startTournament = async () => {
    if (!myTournament) return
    const snap = await get(ref(db, `tournaments/${myTournament}`))
    if (!snap.exists()) return
    const data = snap.val()
    const players = Object.values(data.players || {})
    if (players.length < 2) return setError('Need at least 2 players to start.')
    const bracket = generateBracket(players)
    await set(ref(db, `tournaments/${myTournament}/bracket`), bracket)
    await set(ref(db, `tournaments/${myTournament}/status`), 'playing')
    await set(ref(db, `tournaments/${myTournament}/currentRound`), 0)
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '5rem 1.5rem 3rem', fontFamily: 'DM Sans, sans-serif' }}>

      <button onClick={() => navigate('/select')} style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Competitive</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Tournament</h1>
          <p style={{ color: t.textMuted, fontSize: '0.85rem', margin: 0 }}>Bracket-style competition · up to 8 players</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
          {['create', 'browse'].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, padding: '0.45rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s', background: tab === tb ? '#fbbf24' : 'transparent', color: tab === tb ? '#060912' : t.textMuted }}>
              {tb === 'create' ? '+ Create Tournament' : '🔍 Browse Open'}
            </button>
          ))}
        </div>

        {/* CREATE */}
        {tab === 'create' && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '2rem', boxShadow: t.shadow }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: t.textMuted, marginBottom: '0.35rem', fontWeight: 500 }}>Tournament Name</label>
                <input type="text" placeholder="My Tournament..." value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.4)'; e.target.style.background = t.cardHover }}
                  onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: t.textMuted, marginBottom: '0.5rem', fontWeight: 500 }}>Board Size</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[3, 4, 5].map(s => (
                    <button key={s} onClick={() => setBoardSize(s)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s', background: boardSize === s ? '#fbbf24' : t.inputBg, color: boardSize === s ? '#060912' : t.textMuted, border: `1px solid ${boardSize === s ? 'transparent' : t.border}` }}>
                      {s}×{s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '8px' }}><span>⚠</span><span>{error}</span></div>}

              <button onClick={createTournament} disabled={loading} style={{ background: loading ? 'rgba(251,191,36,0.5)' : '#fbbf24', color: '#060912', border: 'none', padding: '0.9rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(251,191,36,0.2)' }}>
                {loading ? 'Creating...' : 'Create Tournament →'}
              </button>
            </div>
          </div>
        )}

        {/* BROWSE */}
        {tab === 'browse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tournaments.length === 0 ? (
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: '0.9rem', margin: '0 0 1rem' }}>No open tournaments. Create one!</p>
                <button onClick={() => setTab('create')} style={{ background: '#fbbf24', color: '#060912', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                  Create Tournament →
                </button>
              </div>
            ) : tournaments.map(tournament => {
              const playerCount = Object.keys(tournament.players || {}).length
              const isMember = tournament.players?.[user.uid]
              return (
                <div key={tournament.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = t.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = t.card}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: t.text, fontSize: '0.95rem', marginBottom: '3px' }}>{tournament.name}</div>
                    <div style={{ fontSize: '0.72rem', color: t.textMuted }}>
                      Host: {tournament.host?.username} · {tournament.boardSize}×{tournament.boardSize} · {playerCount}/{tournament.maxPlayers} players
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: tournament.status === 'waiting' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', color: tournament.status === 'waiting' ? '#22c55e' : '#fbbf24', border: `1px solid ${tournament.status === 'waiting' ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                        {tournament.status === 'waiting' ? 'Open' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                  {!isMember && tournament.status === 'waiting' && (
                    <button onClick={() => joinTournament(tournament.id)} style={{ background: '#fbbf24', color: '#060912', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.2s', flexShrink: 0 }}>
                      Join →
                    </button>
                  )}
                  {isMember && (
                    <span style={{ fontSize: '0.78rem', color: t.accent, fontWeight: 600 }}>✓ Joined</span>
                  )}
                </div>
              )
            })}
            {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '8px' }}><span>⚠</span><span>{error}</span></div>}
          </div>
        )}
      </div>
    </div>
  )
}