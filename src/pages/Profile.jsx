import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ref, get } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard']

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useTheme()

  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [displayFilter, setDisplayFilter] = useState('all')

  const backPath = location.state?.from || '/'

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

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
      console.error('Profile fetch error:', err)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  const handleFilterChange = useCallback((d) => {
    if (d === filter) return
    setFilter(d)
    setTimeout(() => setDisplayFilter(d), 50)
  }, [filter])

  const calcStats = (list) => {
    const wins = list.filter(m => m.outcome === 'win').length
    const losses = list.filter(m => m.outcome === 'loss').length
    const draws = list.filter(m => m.outcome === 'draw').length
    const total = list.length
    return { wins, losses, draws, total, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 }
  }

  const filtered = displayFilter === 'all' ? matches : matches.filter(m => m.difficulty === displayFilter)
  const stats = calcStats(filtered)

  const diffStats = ['easy', 'medium', 'hard'].map(d => ({
    difficulty: d,
    ...calcStats(matches.filter(m => m.difficulty === d))
  }))

  const diffColor = (d) => d === 'easy' ? t.teal : d === 'medium' ? t.amber : t.accent
  const outcomeColor = (o) => o === 'win' ? t.accent : o === 'loss' ? t.danger : t.amber
  const outcomeLabel = (o) => o === 'win' ? 'Win' : o === 'loss' ? 'Loss' : 'Draw'

  const formatDate = (ts) => {
    try {
      return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  if (loading) {
    return (
      <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.accent, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '5rem 1.5rem 3rem', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.3s ease' }}>

      <button onClick={() => navigate(backPath)} style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: profile?.avatar ? '1.75rem' : '1.5rem', color: t.accent }}>
              {profile?.avatar || profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 2px' }}>
                {profile?.username || 'Player'}
              </h1>
              <p style={{ color: t.textFaint, fontSize: '0.8rem', margin: 0 }}>{profile?.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/edit-profile')} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              ✏️ Edit
            </button>
            <button onClick={() => navigate('/friends')} style={{ background: t.purpleBg, border: `1px solid ${t.purpleBorder}`, color: t.purple, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              👫 Friends
            </button>
            <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${t.dangerBorder}`, color: t.danger, padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = t.dangerBg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              Log Out
            </button>
          </div>
        </div>

        {/* Difficulty breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {diffStats.map(d => (
            <div key={d.difficulty}
              onClick={() => handleFilterChange(displayFilter === d.difficulty ? 'all' : d.difficulty)}
              style={{ background: displayFilter === d.difficulty ? t.card : t.gradientCard, border: `1px solid ${displayFilter === d.difficulty ? diffColor(d.difficulty) + '60' : t.border}`, borderRadius: '16px', padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: displayFilter === d.difficulty ? t.shadow : 'none' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <p style={{ fontSize: '0.62rem', color: diffColor(d.difficulty), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>{d.difficulty}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                {[{ val: d.total, lbl: 'Total', col: t.text }, { val: d.wins, lbl: 'Wins', col: t.accent }, { val: `${d.winRate}%`, lbl: 'Rate', col: t.teal }].map((item, i, arr) => (
                  <div key={item.lbl} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: item.col, lineHeight: 1 }}>{item.val}</div>
                      <div style={{ fontSize: '0.52rem', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{item.lbl}</div>
                    </div>
                    {i < arr.length - 1 && <div style={{ width: '1px', height: '24px', background: t.border }} />}
                  </div>
                ))}
              </div>
              {displayFilter === d.difficulty && <div style={{ fontSize: '0.55rem', color: diffColor(d.difficulty), marginTop: '6px' }}>● Filtering</div>}
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '4px' }}>
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={() => handleFilterChange(d)} style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'background 0.25s ease, color 0.25s ease', background: displayFilter === d ? t.accent : 'transparent', color: displayFilter === d ? t.accentText : t.textMuted }}>
              {d}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: stats.total, color: t.text },
            { label: 'Wins', value: stats.wins, color: t.accent },
            { label: 'Losses', value: stats.losses, color: t.danger },
            { label: 'Draws', value: stats.draws, color: t.amber },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: t.teal },
          ].map(s => (
            <div key={s.label} style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '1rem', textAlign: 'center', boxShadow: t.shadowCard }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: s.color, lineHeight: 1, marginBottom: '5px', transition: 'all 0.3s' }}>{s.value}</div>
              <div style={{ fontSize: '0.63rem', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        <div style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: t.shadowCard }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: t.text, margin: 0 }}>
              Performance
              {displayFilter !== 'all' && <span style={{ color: diffColor(displayFilter), marginLeft: '8px', fontSize: '0.72rem', textTransform: 'capitalize' }}>· {displayFilter}</span>}
            </p>
            <span style={{ fontSize: '0.72rem', color: t.textFaint }}>{stats.total} games</span>
          </div>
          {stats.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[{ label: 'Wins', value: stats.wins, color: t.accent }, { label: 'Losses', value: stats.losses, color: t.danger }, { label: 'Draws', value: stats.draws, color: t.amber }].map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: t.textFaint, width: '42px', textAlign: 'right', flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: '7px', borderRadius: '4px', background: t.border, overflow: 'hidden' }}>
                    <div style={{ width: `${stats.total > 0 ? (b.value / stats.total) * 100 : 0}%`, height: '100%', borderRadius: '4px', background: b.color, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: b.color, width: '24px', flexShrink: 0, fontWeight: 600 }}>{b.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: t.textFaint, fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>No games in this category yet.</p>
          )}
        </div>

        {/* Match history */}
        <div style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '1.5rem', boxShadow: t.shadowCard }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: t.text, margin: 0 }}>
              Match History
              {displayFilter !== 'all' && <span style={{ color: diffColor(displayFilter), marginLeft: '8px', fontSize: '0.72rem', textTransform: 'capitalize' }}>· {displayFilter}</span>}
            </p>
            <span style={{ fontSize: '0.72rem', color: t.textFaint }}>{filtered.length} matches</span>
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: t.textFaint, fontSize: '0.82rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>No matches found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {filtered.slice(0, 15).map(match => (
                <div key={match.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '0.7rem 1rem', transition: 'all 0.2s', flexWrap: 'wrap', gap: '0.5rem' }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.card; e.currentTarget.style.borderColor = t.borderHover }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.inputBg; e.currentTarget.style.borderColor = t.border }}>
                  <div style={{ background: `${outcomeColor(match.outcome)}18`, border: `1px solid ${outcomeColor(match.outcome)}40`, color: outcomeColor(match.outcome), padding: '0.18rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, minWidth: '44px', textAlign: 'center' }}>
                    {outcomeLabel(match.outcome)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: diffColor(match.difficulty), textTransform: 'capitalize' }}>{match.difficulty}</span>
                    <span style={{ color: t.border, fontSize: '0.6rem' }}>·</span>
                    <span style={{ fontSize: '0.7rem', color: match.playerSign === 'X' ? t.accent : t.teal }}>Played as {match.playerSign}</span>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: t.textFaint }}>{formatDate(match.timestamp)}</span>
                </div>
              ))}
              {filtered.length > 15 && <p style={{ textAlign: 'center', fontSize: '0.7rem', color: t.textFaint, margin: '0.5rem 0 0' }}>Showing last 15 of {filtered.length}</p>}
            </div>
          )}
        </div>

        <button onClick={() => navigate('/game')} style={{ width: '100%', marginTop: '1.5rem', background: t.accent, color: t.accentText, border: 'none', padding: '0.9rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 8px 24px ${t.accentBg}` }}
          onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'translateY(0)' }}>
          ▶ &nbsp;Play Again
        </button>
      </div>

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  )
}