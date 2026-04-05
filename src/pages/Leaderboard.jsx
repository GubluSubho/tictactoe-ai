import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const FILTERS = ['wins', 'winRate', 'total']
const filterLabel = { wins: 'Most Wins', winRate: 'Best Win Rate', total: 'Most Games' }

export default function Leaderboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('wins')
  const [myRank, setMyRank] = useState(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const snap = await get(ref(db, 'leaderboard'))
      if (snap.exists()) {
        const data = snap.val()
        const list = Object.entries(data).map(([uid, val]) => ({ uid, ...val }))
        setPlayers(list)

        const sorted = [...list].sort((a, b) => b.wins - a.wins)
        const rank = sorted.findIndex(p => p.uid === user?.uid)
        if (rank !== -1) setMyRank(rank + 1)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    }
    setLoading(false)
  }

  const sorted = [...players].sort((a, b) => b[sortBy] - a[sortBy])

  const medalColor = (i) => {
    if (i === 0) return '#fbbf24'
    if (i === 1) return '#94a3b8'
    if (i === 2) return '#c8a26b'
    return 'rgba(255,255,255,0.2)'
  }

  const medalIcon = (i) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `#${i + 1}`
  }

  if (loading) {
    return (
      <div style={{
        background: '#060912', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#c8f04a',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
      </div>
    )
  }

  return (
    <div style={{
      background: '#060912', minHeight: '100vh',
      padding: '5rem 1.5rem 3rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Back */}
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

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{
            color: '#fbbf24', fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Global Rankings
          </p>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'white',
            letterSpacing: '-0.02em', margin: '0 0 0.5rem',
          }}>
            Leaderboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 }}>
            {players.length} players ranked globally
          </p>
        </div>

        {/* Your rank card */}
        {myRank && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(200,240,74,0.08), rgba(200,240,74,0.02))',
            border: '1px solid rgba(200,240,74,0.2)',
            borderRadius: '16px', padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(200,240,74,0.15)',
                border: '1px solid rgba(200,240,74,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '1rem', color: '#c8f04a',
              }}>
                {players.find(p => p.uid === user?.uid)?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                  {players.find(p => p.uid === user?.uid)?.username || 'You'}
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                  Your current ranking
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '2rem', color: '#c8f04a', lineHeight: 1,
              }}>
                #{myRank}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                Global Rank
              </div>
            </div>
          </div>
        )}

        {/* Sort tabs */}
        <div style={{
          display: 'flex', gap: '0.4rem', marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '4px',
        }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setSortBy(f)}
              style={{
                flex: 1, padding: '0.45rem 0.5rem',
                borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.25s ease, color 0.25s ease',
                background: sortBy === f ? '#c8f04a' : 'transparent',
                color: sortBy === f ? '#060912' : 'rgba(255,255,255,0.4)',
              }}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>

        {/* Players list */}
        {players.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '3rem',
            textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', margin: 0 }}>
              No players on the leaderboard yet. Be the first to play!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sorted.map((player, i) => {
              const isMe = player.uid === user?.uid
              return (
                <div
                  key={player.uid}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '1rem', padding: '1rem 1.25rem',
                    background: isMe
                      ? 'linear-gradient(145deg, rgba(200,240,74,0.06), rgba(200,240,74,0.01))'
                      : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    border: isMe
                      ? '1px solid rgba(200,240,74,0.2)'
                      : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isMe) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isMe) {
                      e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    }
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: '36px', textAlign: 'center', flexShrink: 0,
                    fontFamily: 'Syne, sans-serif', fontWeight: 800,
                    fontSize: i < 3 ? '1.3rem' : '0.85rem',
                    color: medalColor(i),
                  }}>
                    {medalIcon(i)}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: isMe
                      ? 'rgba(200,240,74,0.15)'
                      : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isMe ? 'rgba(200,240,74,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '0.9rem',
                    color: isMe ? '#c8f04a' : 'rgba(255,255,255,0.5)',
                  }}>
                    {player.username?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: '0.9rem',
                      color: isMe ? '#c8f04a' : 'white',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {player.username || 'Player'}
                      {isMe && (
                        <span style={{
                          fontSize: '0.62rem', color: '#c8f04a',
                          background: 'rgba(200,240,74,0.1)',
                          border: '1px solid rgba(200,240,74,0.2)',
                          padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                        }}>You</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                      {player.total} games · {player.winRate}% win rate
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: '1.1rem', color: '#c8f04a', lineHeight: 1,
                      }}>
                        {player.wins}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Wins
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: '1.1rem', color: '#7ef2c8', lineHeight: 1,
                      }}>
                        {player.winRate}%
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Rate
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Play CTA */}
        <button
          onClick={() => navigate('/select')}
          style={{
            width: '100%', marginTop: '2rem',
            background: '#c8f04a', color: '#060912',
            border: 'none', padding: '0.9rem', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: 700,
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
          ▶ &nbsp;Play & Climb the Ranks
        </button>

      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const backBtnStyle = {
  position: 'fixed', top: '1.5rem', left: '1.5rem',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  padding: '0.5rem 1rem', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s ease', zIndex: 10,
  fontFamily: 'DM Sans, sans-serif',
}