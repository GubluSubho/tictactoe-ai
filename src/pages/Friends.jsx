import { useState, useEffect, useRef } from 'react'
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
  const [actionLoading, setActionLoading] = useState('')

  const unsubRefs = useRef([])

  useEffect(() => {
    if (!user) return

    // Get my username
    get(ref(db, `users/${user.uid}/username`)).then(snap => {
      if (snap.exists()) setMyUsername(snap.val())
    })

    // Set online status
    set(ref(db, `online/${user.uid}`), true).catch(() => {})

    // Listen to friends list
    const friendsRef = ref(db, `users/${user.uid}/friends`)
    const unsub1 = onValue(friendsRef, async snap => {
      if (!snap.exists()) { setFriends([]); return }
      const friendIds = Object.keys(snap.val())
      try {
        const profiles = await Promise.all(
          friendIds.map(async id => {
            try {
              const [profileSnap, onlineSnap] = await Promise.all([
                get(ref(db, `users/${id}`)),
                get(ref(db, `online/${id}`)),
              ])
              return {
                uid: id,
                ...(profileSnap.exists() ? profileSnap.val() : { username: 'Unknown' }),
                online: onlineSnap.exists() ? onlineSnap.val() : false,
              }
            } catch { return { uid: id, username: 'Unknown', online: false } }
          })
        )
        setFriends(profiles.filter(Boolean))
      } catch (err) {
        console.error('Friends load error:', err)
      }
    })

    // Listen to friend requests
    const reqRef = ref(db, `users/${user.uid}/friendRequests`)
    const unsub2 = onValue(reqRef, async snap => {
      if (!snap.exists()) { setRequests([]); return }
      const reqIds = Object.keys(snap.val())
      try {
        const profiles = await Promise.all(
          reqIds.map(async id => {
            try {
              const profileSnap = await get(ref(db, `users/${id}`))
              return { uid: id, ...(profileSnap.exists() ? profileSnap.val() : { username: 'Unknown' }) }
            } catch { return { uid: id, username: 'Unknown' } }
          })
        )
        setRequests(profiles.filter(Boolean))
      } catch (err) {
        console.error('Requests load error:', err)
      }
    })

    unsubRefs.current = [unsub1, unsub2]
    return () => { unsub1(); unsub2() }
  }, [user])

  const searchUser = async () => {
    setSearchError('')
    setSearchResult(null)

    const query = searchQuery.trim()
    if (!query) return setSearchError('Enter a username to search.')
    if (query.length < 3) return setSearchError('Username must be at least 3 characters.')

    // Cannot search for yourself
    if (myUsername && query.toLowerCase() === myUsername.toLowerCase()) {
      return setSearchError("That's your own username!")
    }

    setSearchLoading(true)
    try {
      // Look up username (case insensitive — stored lowercase)
      const usernameSnap = await get(ref(db, `usernames/${query.toLowerCase()}`))

      if (!usernameSnap.exists()) {
        setSearchLoading(false)
        return setSearchError(`No user found with username "${query}". Check the spelling.`)
      }

      const uid = usernameSnap.val()

      // Get profile — use leaderboard as fallback since users/$uid requires auth match
      let profileData = { username: query, elo: 1000, avatar: '' }

      try {
        const profileSnap = await get(ref(db, `users/${uid}`))
        if (profileSnap.exists()) profileData = { ...profileData, ...profileSnap.val() }
      } catch {
        // Try leaderboard as fallback (publicly readable)
        try {
          const lbSnap = await get(ref(db, `leaderboard/${uid}`))
          if (lbSnap.exists()) profileData = { ...profileData, ...lbSnap.val() }
        } catch {}
      }

      // Check if already friends
      const friendSnap = await get(ref(db, `users/${user.uid}/friends/${uid}`))
      const alreadyFriend = friendSnap.exists()

      // Check if request already sent
      const sentSnap = await get(ref(db, `users/${uid}/friendRequests/${user.uid}`))
      const requestSent = sentSnap.exists()

      // Check if they sent us a request
      const receivedSnap = await get(ref(db, `users/${user.uid}/friendRequests/${uid}`))
      const requestReceived = receivedSnap.exists()

      setSearchResult({
        uid,
        ...profileData,
        alreadyFriend,
        requestSent,
        requestReceived,
      })
    } catch (err) {
      console.error('Search error:', err)
      setSearchError('Search failed. Please try again.')
    }
    setSearchLoading(false)
  }

  const sendRequest = async (targetUid) => {
    setActionLoading('send')
    try {
      await set(ref(db, `users/${targetUid}/friendRequests/${user.uid}`), {
        from: user.uid,
        fromUsername: myUsername,
        timestamp: Date.now(),
      })
      setSearchResult(prev => ({ ...prev, requestSent: true }))
      setSearchError('')
    } catch (err) {
      console.error('Send request error:', err)
      setSearchError('Failed to send request. Try again.')
    }
    setActionLoading('')
  }

  const acceptRequest = async (fromUid) => {
    setActionLoading(`accept-${fromUid}`)
    try {
      await Promise.all([
        set(ref(db, `users/${user.uid}/friends/${fromUid}`), true),
        set(ref(db, `users/${fromUid}/friends/${user.uid}`), true),
        remove(ref(db, `users/${user.uid}/friendRequests/${fromUid}`)),
      ])
    } catch (err) {
      console.error('Accept error:', err)
    }
    setActionLoading('')
  }

  const declineRequest = async (fromUid) => {
    setActionLoading(`decline-${fromUid}`)
    try {
      await remove(ref(db, `users/${user.uid}/friendRequests/${fromUid}`))
    } catch (err) {
      console.error('Decline error:', err)
    }
    setActionLoading('')
  }

  const removeFriend = async (friendUid) => {
    setActionLoading(`remove-${friendUid}`)
    try {
      await Promise.all([
        remove(ref(db, `users/${user.uid}/friends/${friendUid}`)),
        remove(ref(db, `users/${friendUid}/friends/${user.uid}`)),
      ])
    } catch (err) {
      console.error('Remove friend error:', err)
    }
    setActionLoading('')
  }

  const card = { background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '1rem 1.25rem', transition: 'all 0.2s' }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '5rem 1.5rem 3rem', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.3s ease' }}>

      <button onClick={() => navigate('/select')} style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: t.accent, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Social</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Friends</h1>
          <p style={{ color: t.textMuted, fontSize: '0.85rem', margin: 0 }}>
            {friends.length} friend{friends.length !== 1 ? 's' : ''} · {requests.length} pending
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
          {[
            { key: 'friends', label: `Friends (${friends.length})` },
            { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
            { key: 'find', label: 'Find Friends' },
          ].map(tb => (
            <button key={tb.key} onClick={() => { setTab(tb.key); setSearchError(''); setSearchResult(null); setSearchQuery('') }} style={{ flex: 1, padding: '0.45rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s', background: tab === tb.key ? t.accent : 'transparent', color: tab === tb.key ? t.accentText : t.textMuted, position: 'relative', whiteSpace: 'nowrap' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* FRIENDS TAB */}
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {friends.length === 0 ? (
              <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: '0.9rem', margin: '0 0 1rem' }}>No friends yet.</p>
                <button onClick={() => setTab('find')} style={{ background: t.accent, color: t.accentText, border: 'none', padding: '0.65rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                  Find Friends →
                </button>
              </div>
            ) : friends.map(friend => {
              const rank = getRank(friend.elo || 1000)
              return (
                <div key={friend.uid} style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem' }}
                  onMouseEnter={e => e.currentTarget.style.background = t.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = t.gradientCard}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: friend.avatar ? '1.4rem' : '1rem', color: t.accent, fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
                      {friend.avatar || friend.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: friend.online ? '#22c55e' : t.textFaint, border: `2px solid ${t.bg}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: t.text, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.username}</div>
                    <div style={{ fontSize: '0.7rem', color: rank.color }}>{rank.icon} {rank.title} · {friend.elo || 1000} ELO · <span style={{ color: friend.online ? '#22c55e' : t.textFaint }}>{friend.online ? 'Online' : 'Offline'}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {friend.online && (
                      <button onClick={() => navigate('/online')} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        ⚔️ Challenge
                      </button>
                    )}
                    <button onClick={() => removeFriend(friend.uid)} disabled={actionLoading === `remove-${friend.uid}`} style={{ background: 'transparent', border: `1px solid ${t.dangerBorder}`, color: t.danger, padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', opacity: actionLoading === `remove-${friend.uid}` ? 0.5 : 1 }}>
                      {actionLoading === `remove-${friend.uid}` ? '...' : 'Remove'}
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
              <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: '0.9rem', margin: 0 }}>No pending friend requests.</p>
              </div>
            ) : requests.map(req => (
              <div key={req.uid} style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: req.avatar ? '1.4rem' : '1rem', color: t.accent, fontFamily: 'Syne, sans-serif', fontWeight: 800, flexShrink: 0 }}>
                  {req.avatar || req.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: t.text, fontSize: '0.9rem' }}>{req.username}</div>
                  <div style={{ fontSize: '0.72rem', color: t.textMuted }}>Wants to be your friend</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => acceptRequest(req.uid)} disabled={actionLoading === `accept-${req.uid}`} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', opacity: actionLoading === `accept-${req.uid}` ? 0.5 : 1 }}>
                    {actionLoading === `accept-${req.uid}` ? '...' : '✓ Accept'}
                  </button>
                  <button onClick={() => declineRequest(req.uid)} disabled={actionLoading === `decline-${req.uid}`} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', opacity: actionLoading === `decline-${req.uid}` ? 0.5 : 1 }}>
                    {actionLoading === `decline-${req.uid}` ? '...' : '✗ Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FIND TAB */}
        {tab === 'find' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ ...card, padding: '1.25rem' }}>
              <p style={{ fontSize: '0.78rem', color: t.textMuted, margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                Search by exact username. Usernames are case-insensitive.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter exact username..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchError(''); setSearchResult(null) }}
                  onKeyDown={e => e.key === 'Enter' && searchUser()}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                  onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
                />
                <button onClick={searchUser} disabled={searchLoading} style={{ background: t.accent, color: t.accentText, border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', cursor: searchLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.2s', opacity: searchLoading ? 0.7 : 1, flexShrink: 0 }}>
                  {searchLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', border: `2px solid ${t.accentText}40`, borderTopColor: t.accentText, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      ...
                    </span>
                  ) : 'Search'}
                </button>
              </div>
            </div>

            {searchError && (
              <div style={{ background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: t.danger, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠</span><span>{searchError}</span>
              </div>
            )}

            {searchResult && (() => {
              const rank = getRank(searchResult.elo || 1000)
              return (
                <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem', background: t.card, flexWrap: 'wrap' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: searchResult.avatar ? '1.6rem' : '1.1rem', color: t.accent, fontFamily: 'Syne, sans-serif', fontWeight: 800, flexShrink: 0 }}>
                    {searchResult.avatar || searchResult.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: t.text, fontSize: '0.95rem', marginBottom: '2px' }}>{searchResult.username}</div>
                    <div style={{ fontSize: '0.72rem', color: rank.color }}>{rank.icon} {rank.title} · {searchResult.elo || 1000} ELO</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {searchResult.alreadyFriend ? (
                      <span style={{ fontSize: '0.78rem', color: t.accent, fontWeight: 600 }}>✓ Friends</span>
                    ) : searchResult.requestReceived ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => acceptRequest(searchResult.uid)} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                          ✓ Accept
                        </button>
                      </div>
                    ) : searchResult.requestSent ? (
                      <span style={{ fontSize: '0.78rem', color: t.textMuted }}>Request sent ✓</span>
                    ) : (
                      <button onClick={() => sendRequest(searchResult.uid)} disabled={actionLoading === 'send'} style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', opacity: actionLoading === 'send' ? 0.6 : 1 }}>
                        {actionLoading === 'send' ? '...' : '+ Add Friend'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* How it works hint */}
            <div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: t.textFaint, margin: 0, lineHeight: 1.6 }}>
                💡 <strong style={{ color: t.textMuted }}>How to find friends:</strong> Ask your friend for their exact TTTAI username and type it here. Usernames are case-insensitive — <em>Subho_123</em> and <em>subho_123</em> both work.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-8px);opacity:1} }
      `}</style>
    </div>
  )
}