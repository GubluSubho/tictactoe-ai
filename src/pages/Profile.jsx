import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ref, get } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard']

const diffColor = (d) => d === 'easy' ? '#7ef2c8' : d === 'medium' ? '#fbbf24' : '#c8f04a'
const outcomeColor = (o) => o === 'win' ? '#c8f04a' : o === 'loss' ? '#ef4444' : '#fbbf24'
const outcomeLabel = (o) => o === 'win' ? 'Win' : o === 'loss' ? 'Loss' : 'Draw'

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [displayFilter, setDisplayFilter] = useState('all')

  // Where to go back — if came from game send back to game, else home
  const backPath = location.state?.from || '/'

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  // Smooth filter switch — delay display update to avoid jitter
  const handleFilterChange = useCallback((d) => {
    if (d === filter) return
    setFilter(d)
    setTimeout(() => setDisplayFilter(d), 50)
  }, [filter])

  const fetchProfile = async () => {
    try {
      const userSnap = await get(ref(db, `users/${user.uid}`))
      if (userSnap.exists()) setProfile(userSnap.val())
      const matchSnap = await get(ref(db, `matches/${user.uid}`))
      if (matchSnap.exists()) {
        const raw = matchSnap.val()
        const list = Object.entries(raw)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => b.timestamp - a.timestamp)
        setMatches(list)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  const calcStats = (list) => {
    const wins = list.filter(m => m.outcome === 'win').length
    const losses = list.filter(m => m.outcome === 'loss').length
    const draws = list.filter(m => m.outcome === 'draw').length
    const total = list.length
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    return { wins, losses, draws, total, winRate }
  }

  const filtered = displayFilter === 'all'
    ? matches
    : matches.filter(m => m.difficulty === displayFilter)

  const stats = calcStats(filtered)

  const diffStats = ['easy', 'medium', 'hard'].map(d => ({
    difficulty: d,
    ...calcStats(matches.filter(m => m.difficulty === d))
  }))

  const formatDate = (ts) => new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  if (loading) {
    return (
      <div style={{
        background: '#060912', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#c8f04a',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
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

  return (
    <div style={{
      background: '#060912', minHeight: '100vh',
      padding: '5rem 1.5rem 3rem',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Back button */}
      <button
        onClick={() => navigate(backPath)}
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

      <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(200,240,74,0.15), rgba(126,242,200,0.08))',
              border: '1px solid rgba(200,240,74,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '1.5rem', color: '#c8f04a',
            }}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '1.5rem', color: 'white',
                letterSpacing: '-0.02em', margin: '0 0 2px',
              }}>
                {profile?.username || 'Player'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>
                {profile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'rgba(239,68,68,0.7)',
              padding: '0.5rem 1.25rem', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.82rem',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
              e.currentTarget.style.color = 'rgba(239,68,68,0.7)'
            }}
          >
            Log Out
          </button>
        </div>

        {/* Difficulty breakdown cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: '0.75rem', marginBottom: '1.5rem',
        }}>
          {diffStats.map(d => (
            <div
              key={d.difficulty}
              onClick={() => handleFilterChange(filter === d.difficulty ? 'all' : d.difficulty)}
              style={{
                background: displayFilter === d.difficulty
                  ? `linear-gradient(145deg, rgba(${d.difficulty === 'easy' ? '126,242,200' : d.difficulty === 'medium' ? '251,191,36' : '200,240,74'},0.08), rgba(255,255,255,0.01))`
                  : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                border: `1px solid ${displayFilter === d.difficulty ? diffColor(d.difficulty) + '50' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '1.1rem 1rem',
                textAlign: 'center', cursor: 'pointer',
                transition: 'background 0.4s ease, border-color 0.4s ease, transform 0.2s ease, box-shadow 0.4s ease',
                boxShadow: displayFilter === d.difficulty
                  ? `0 4px 24px ${diffColor(d.difficulty)}18`
                  : '0 4px 16px rgba(0,0,0,0.25)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p style={{
                fontSize: '0.65rem', color: diffColor(d.difficulty),
                fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', margin: '0 0 0.65rem',
              }}>
                {d.difficulty}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                {[
                  { val: d.total, lbl: 'Total', col: 'white' },
                  { val: d.wins, lbl: 'Wins', col: '#c8f04a' },
                  { val: `${d.winRate}%`, lbl: 'Rate', col: '#7ef2c8' },
                ].map((item, i, arr) => (
                  <div key={item.lbl} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: '1.2rem', color: item.col, lineHeight: 1,
                      }}>
                        {item.val}
                      </div>
                      <div style={{
                        fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px',
                      }}>
                        {item.lbl}
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.07)' }} />
                    )}
                  </div>
                ))}
              </div>
              {displayFilter === d.difficulty && (
                <div style={{
                  fontSize: '0.58rem', color: diffColor(d.difficulty),
                  marginTop: '6px', opacity: 0.8,
                }}>
                  ● Filtering
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: '0.4rem', marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '4px',
        }}>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => handleFilterChange(d)}
              style={{
                flex: 1, padding: '0.4rem 0.5rem',
                borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'capitalize',
                transition: 'background 0.25s ease, color 0.25s ease',
                background: displayFilter === d ? '#c8f04a' : 'transparent',
                color: displayFilter === d ? '#060912' : 'rgba(255,255,255,0.4)',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.75rem', marginBottom: '1.5rem',
          transition: 'all 0.3s ease',
        }}>
          {[
            { label: 'Total', value: stats.total, color: 'white' },
            { label: 'Wins', value: stats.wins, color: '#c8f04a' },
            { label: 'Losses', value: stats.losses, color: '#ef4444' },
            { label: 'Draws', value: stats.draws, color: '#fbbf24' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: '#7ef2c8' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '1rem',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '1.6rem', color: s.color,
                lineHeight: 1, marginBottom: '5px',
                transition: 'color 0.3s ease',
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: '0.63rem', color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.1rem',
          }}>
            <p style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 600,
              fontSize: '0.9rem', color: 'white', margin: 0,
            }}>
              Performance
              {displayFilter !== 'all' && (
                <span style={{
                  color: diffColor(displayFilter), marginLeft: '8px',
                  fontSize: '0.72rem', textTransform: 'capitalize',
                  transition: 'color 0.3s ease',
                }}>
                  · {displayFilter}
                </span>
              )}
            </p>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
              {stats.total} games
            </span>
          </div>

          {stats.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Wins', value: stats.wins, color: '#c8f04a' },
                { label: 'Losses', value: stats.losses, color: '#ef4444' },
                { label: 'Draws', value: stats.draws, color: '#fbbf24' },
              ].map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
                    width: '42px', textAlign: 'right', flexShrink: 0,
                  }}>
                    {b.label}
                  </span>
                  <div style={{
                    flex: 1, height: '7px', borderRadius: '4px',
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${stats.total > 0 ? (b.value / stats.total) * 100 : 0}%`,
                      height: '100%', borderRadius: '4px', background: b.color,
                      transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.7rem', color: b.color,
                    width: '24px', flexShrink: 0, fontWeight: 600,
                  }}>
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{
              color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem',
              margin: 0, textAlign: 'center', padding: '0.5rem 0',
            }}>
              No games in this category yet.
            </p>
          )}
        </div>

        {/* Match history */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '1.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.25rem',
          }}>
            <p style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 600,
              fontSize: '0.9rem', color: 'white', margin: 0,
            }}>
              Match History
              {displayFilter !== 'all' && (
                <span style={{
                  color: diffColor(displayFilter), marginLeft: '8px',
                  fontSize: '0.72rem', textTransform: 'capitalize',
                }}>
                  · {displayFilter}
                </span>
              )}
            </p>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
              {filtered.length} matches
            </span>
          </div>

          {filtered.length === 0 ? (
            <p style={{
              color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem',
              margin: 0, textAlign: 'center', padding: '1rem 0',
            }}>
              No matches found for this filter.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {filtered.slice(0, 15).map(match => (
                <div
                  key={match.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px', padding: '0.7rem 1rem',
                    transition: 'background 0.2s ease, border-color 0.2s ease',
                    flexWrap: 'wrap', gap: '0.5rem',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{
                    background: `rgba(${match.outcome === 'win' ? '200,240,74' : match.outcome === 'loss' ? '239,68,68' : '251,191,36'},0.1)`,
                    border: `1px solid rgba(${match.outcome === 'win' ? '200,240,74' : match.outcome === 'loss' ? '239,68,68' : '251,191,36'},0.25)`,
                    color: outcomeColor(match.outcome),
                    padding: '0.18rem 0.6rem', borderRadius: '6px',
                    fontSize: '0.7rem', fontWeight: 700,
                    minWidth: '44px', textAlign: 'center',
                  }}>
                    {outcomeLabel(match.outcome)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600,
                      color: diffColor(match.difficulty),
                      textTransform: 'capitalize',
                    }}>
                      {match.difficulty}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem' }}>·</span>
                    <span style={{
                      fontSize: '0.7rem',
                      color: match.playerSign === 'X' ? '#c8f04a' : '#7ef2c8',
                    }}>
                      Played as {match.playerSign}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.2)' }}>
                    {formatDate(match.timestamp)}
                  </span>
                </div>
              ))}

              {filtered.length > 15 && (
                <p style={{
                  textAlign: 'center', fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.2)', margin: '0.5rem 0 0',
                }}>
                  Showing last 15 of {filtered.length} matches
                </p>
              )}
            </div>
          )}
        </div>

        {/* Play CTA */}
        <button
          onClick={() => navigate('/game')}
          style={{
            width: '100%', marginTop: '1.5rem',
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
          ▶ &nbsp;Play Again
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