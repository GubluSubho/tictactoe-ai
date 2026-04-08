import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, get, set, onValue, remove } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getRank } from '../utils/elo'

export default function Friends() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()

  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [myUsername, setMyUsername] = useState('')

  useEffect(() => {
    if (!user) return

    get(ref(db, `users/${user.uid}/username`)).then(snap => {
      if (snap.exists()) setMyUsername(snap.val())
    })

    // Listen to friends
    const friendsRef = ref(db, `users/${user.uid}/friends`)
    const unsub = onValue(friendsRef, async snap => {
      if (!snap.exists()) { setFriends([]); return }
      const friendIds = Object.keys(snap.val())
      const profiles = await Promise.all(friendIds.map(async id => {
        const [profileSnap, onlineSnap, eloSnap] = await Promise.all([
          get(ref(db, `users/${id}`)),
          get(ref(db, `online/${id}`)),
          get(ref(db, `users/${id}/elo`)),
        ])
        return {
          uid: id,
          ...(profileSnap.exists() ? profileSnap.val() : {}),
          online: onlineSnap.exists() ? onlineSnap.val() : false,
          elo: eloSnap.exists() ? eloSnap.val() : 1000,
        }
      }))
      setFriends(profiles)
    })

    // Listen to friend requests
    const reqRef = ref(db, `users/${user.uid}/friendRequests`)
    const unsub2 = onValue(reqRef, async snap => {
      if (!snap.exists()) { setRequests([]); return }
      const reqIds = Object.keys(snap.val())
      const profiles = await Promise.all(reqIds.map(async id => {
        const profileSnap = await get(ref(db, `users/${id}`))
        return { uid: id, ...(profileSnap.exists() ? profileSnap.val() : {}) }
      }))
      setRequests(profiles)
    })

    // Set online status
    set(ref(db, `online/${user.uid}`), true)

    return () => { unsub(); unsub2() }
  }, [user])

  const searchUser = async () => {
    setSearchError('')
    setSearchResult(null)
    if (!searchQuery.trim()) return setSearchError('Enter a username to search.')
    if (searchQuery.trim().toLowerCase() === myUsername.toLowerCase()) return setSearchError("That's you!")
    setSearchLoading(true)
    try {
      const snap = await get(ref(db, `usernames/${searchQuery.trim().toLowerCase()}`))
      if (!snap.exists()) { setSearchLoading(false); return setSearchError('User not found.') }
      const uid = snap.val()
      const profileSnap = await get(ref(db, `users/${uid}`))
      const eloSnap = await get(ref(db, `users/${uid}/elo`))
      const alreadyFriend = friends.some(f => f.uid === uid)
      const pendingSnap = await get(ref(db, `users/${uid}/friendRequests/${user.uid}`))
      setSearchResult({
        uid,
        ...(profileSnap.exists() ? profileSnap.val() : {}),
        elo: eloSnap.exists() ? eloSnap.val() : 1000,
        alreadyFriend,
        requestSent: pendingSnap.exists(),
      })
    } catch {
      setSearchError('Search failed. Try again.')
    }
    setSearchLoading(false)
  }

  const sendRequest = async (targetUid) => {
    await set(ref(db, `users/${targetUid}/friendRequests/${user.uid}`), true)
    setSearchResult(prev => ({ ...prev, requestSent: true }))
  }

  const acceptRequest = async (fromUid) => {
    await set(ref(db, `users/${user.uid}/friends/${fromUid}`), true)
    await set(ref(db, `users/${fromUid}/friends/${user.uid}`), true)
    await remove(ref(db, `users/${user.uid}/friendRequests/${fromUid}`))
  }

  const declineRequest = async (fromUid) => {
    await remove(ref(db, `users/${user.uid}/friendRequests/${fromUid}`))
  }

  const removeFriend = async (friendUid) => {
    await remove(ref(db, `users/${user.uid}/friends/${friendUid}`))
    await remove(ref(db, `users/${friendUid}/friends/${user.uid}`))
  }

  const challengeFriend = (friendUid) => {
    navigate('/online')
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '5rem 1.5rem 3rem', fontFamily: 'DM Sans, sans-serif' }}>

      <button onClick={() => navigate('/select')} style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: t.accent, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Social</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Friends</h1>
          <p style={{ color: t.textMuted, fontSize: '0.85rem', margin: 0 }}>{friends.length} friends · {requests.length} pending</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
          {['friends', 'requests', 'find'].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, padding: '0.45rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s ease', background: tab === tb ? t.accent : 'transparent', color: tab === tb ? '#060912' : t.textMuted, position: 'relative' }}>
              {tb === 'friends' ? 'Friends' : tb === 'requests' ? 'Requests' : 'Find Friends'}
              {tb === 'requests' && requests.length > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '6px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* FRIENDS TAB */}
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {friends.length === 0 ? (
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: '0.9rem', margin: '0 0 1rem' }}>No friends yet. Find some!</p>
                <button onClick={() => setTab('find')} style={{ background: t.accent, color: '#060912', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                  Find Friends →
                </button>
              </div>
            ) : friends.map(friend => {
              const rank = getRank(friend.elo || 1000)
              return (
                <div key={friend.uid} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = t.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = t.card}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                      {friend.avatar || friend.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: friend.online ? '#22c55e' : t.textFaint, border: `2px solid ${t.bg}` }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: t.text, fontSize: '0.9rem' }}>{friend.username}</div>
                    <div style={{ fontSize: '0.7rem', color: rank.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {rank.icon} {rank.title} · {friend.elo || 1000} ELO
                      <span style={{ color: friend.online ? '#22c55e' : t.textFaint, marginLeft: '4px' }}>
                        · {friend.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {friend.online && (
                      <button onClick={() => challengeFriend(friend.uid)} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = `${t.accentBg}dd`}
                        onMouseLeave={e => e.currentTarget.style.background = t.accentBg}>
                        ⚔️ Challenge
                      </button>
                    )}
                    <button onClick={() => removeFriend(friend.uid)} style={{ background: 'transparent', border: `1px solid rgba(239,68,68,0.2)`, color: 'rgba(239,68,68,0.6)', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)' }}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {requests.length === 0 ? (
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: '0.9rem', margin: 0 }}>No pending requests.</p>
              </div>
            ) : requests.map(req => (
              <div key={req.uid} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {req.avatar || req.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: t.text, fontSize: '0.9rem' }}>{req.username}</div>
                  <div style={{ fontSize: '0.72rem', color: t.textMuted }}>Wants to be your friend</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => acceptRequest(req.uid)} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
                    ✓ Accept
                  </button>
                  <button onClick={() => declineRequest(req.uid)} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}>
                    ✗ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FIND TAB */}
        {tab === 'find' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" placeholder="Search by username..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
              />
              <button onClick={searchUser} disabled={searchLoading} style={{ background: t.accent, color: '#060912', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', cursor: searchLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.2s', opacity: searchLoading ? 0.6 : 1 }}>
                {searchLoading ? '...' : 'Search'}
              </button>
            </div>

            {searchError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '8px' }}><span>⚠</span><span>{searchError}</span></div>}

            {searchResult && (() => {
              const rank = getRank(searchResult.elo || 1000)
              return (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                    {searchResult.avatar || searchResult.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: t.text, fontSize: '0.95rem', marginBottom: '2px' }}>{searchResult.username}</div>
                    <div style={{ fontSize: '0.72rem', color: rank.color }}>{rank.icon} {rank.title} · {searchResult.elo || 1000} ELO</div>
                  </div>
                  {searchResult.alreadyFriend ? (
                    <span style={{ fontSize: '0.78rem', color: t.accent, fontWeight: 600 }}>✓ Already friends</span>
                  ) : searchResult.requestSent ? (
                    <span style={{ fontSize: '0.78rem', color: t.textMuted }}>Request sent</span>
                  ) : (
                    <button onClick={() => sendRequest(searchResult.uid)} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${t.accentBg}dd`}
                      onMouseLeave={e => e.currentTarget.style.background = t.accentBg}>
                      + Add Friend
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}