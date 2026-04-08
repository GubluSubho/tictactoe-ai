import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, get, set } from 'firebase/database'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const AVATARS = ['🎮', '🧠', '♟️', '🤖', '🦊', '🐉', '⚡', '🌟', '🎯', '🔥', '💎', '👾', '🚀', '🎲', '🦁']

const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u)

export default function EditProfile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()

  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [avatar, setAvatar] = useState('🎮')
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!user) return
    get(ref(db, `users/${user.uid}`)).then(snap => {
      if (snap.exists()) {
        const data = snap.val()
        setUsername(data.username || '')
        setOriginalUsername(data.username || '')
        setAvatar(data.avatar || '🎮')
      }
    })
  }, [user])

  const checkUsername = (val) => {
    if (val === originalUsername) { setUsernameStatus('same'); return }
    if (!val || val.length < 3) { setUsernameStatus('idle'); return }
    if (!isValidUsername(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const snap = await get(ref(db, `usernames/${val.toLowerCase()}`))
      setUsernameStatus(snap.exists() ? 'taken' : 'available')
    }, 600)
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    if (usernameStatus === 'taken') return setError('Username already taken.')
    if (usernameStatus === 'checking') return setError('Still checking username...')
    if (usernameStatus === 'invalid') return setError('Username: 3-20 chars, letters/numbers/underscores only.')
    if (!username) return setError('Username cannot be empty.')

    setLoading(true)
    try {
      // Remove old username reservation if changed
      if (username !== originalUsername) {
        await set(ref(db, `usernames/${originalUsername.toLowerCase()}`), null)
        await set(ref(db, `usernames/${username.toLowerCase()}`), user.uid)
      }

      await updateProfile(auth.currentUser, { displayName: username })
      await set(ref(db, `users/${user.uid}/username`), username)
      await set(ref(db, `users/${user.uid}/avatar`), avatar)

      // Update leaderboard entry if exists
      const lbSnap = await get(ref(db, `leaderboard/${user.uid}`))
      if (lbSnap.exists()) {
        await set(ref(db, `leaderboard/${user.uid}/username`), username)
        await set(ref(db, `leaderboard/${user.uid}/avatar`), avatar)
      }

      setOriginalUsername(username)
      setSuccess('Profile updated successfully!')
    } catch {
      setError('Failed to update profile. Try again.')
    }
    setLoading(false)
  }

  const borderColor = () => {
    if (usernameStatus === 'available') return 'rgba(200,240,74,0.5)'
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return 'rgba(239,68,68,0.5)'
    return t.border
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '5rem 1.5rem 3rem', fontFamily: 'DM Sans, sans-serif' }}>

      <button onClick={() => navigate('/profile', { state: { from: '/' } })} style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
        ← Back
      </button>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: t.accent, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Account Settings</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: t.text, letterSpacing: '-0.02em', margin: 0 }}>Edit Profile</h1>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '24px', padding: '2rem', boxShadow: t.shadow }}>

          {/* Avatar picker */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', color: t.textMuted, marginBottom: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' }}>Choose Avatar</label>

            {/* Current avatar preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: t.accentBg, border: `2px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                {avatar}
              </div>
              <div>
                <p style={{ color: t.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '0 0 4px', fontSize: '1rem' }}>{username || 'Your Name'}</p>
                <p style={{ color: t.textFaint, fontSize: '0.78rem', margin: 0 }}>Preview</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{ height: '48px', borderRadius: '10px', border: `1px solid ${avatar === a ? t.accentBorder : t.border}`, background: avatar === a ? t.accentBg : t.inputBg, fontSize: '1.4rem', cursor: 'pointer', transition: 'all 0.2s ease', transform: avatar === a ? 'scale(1.1)' : 'scale(1)' }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.76rem', color: t.textMuted, marginBottom: '0.35rem', fontWeight: 500 }}>
              Username
              <span style={{ color: t.textFaint, marginLeft: '6px', fontSize: '0.68rem' }}>3-20 chars · letters, numbers, _</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input type="text" value={username} maxLength={20}
                onChange={e => { setUsername(e.target.value.replace(/\s/g, '')); checkUsername(e.target.value.replace(/\s/g, '')) }}
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '10px', border: `1px solid ${borderColor()}`, background: t.inputBg, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.background = t.cardHover}
                onBlur={e => e.target.style.background = t.inputBg}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem' }}>
                {usernameStatus === 'checking' && <span style={{ color: t.textFaint }}>⟳</span>}
                {usernameStatus === 'available' && <span style={{ color: t.accent }}>✓</span>}
                {usernameStatus === 'taken' && <span style={{ color: '#ef4444' }}>✗</span>}
                {usernameStatus === 'same' && <span style={{ color: t.accent }}>✓</span>}
              </span>
            </div>
            {usernameStatus === 'taken' && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>Username already taken</p>}
            {usernameStatus === 'available' && <p style={{ fontSize: '0.7rem', color: t.accent, margin: '4px 0 0' }}>✓ Available</p>}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '8px' }}><span>⚠</span><span>{error}</span></div>}
          {success && <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: t.accent, display: 'flex', gap: '8px' }}><span>✓</span><span>{success}</span></div>}

          <button onClick={handleSave} disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none', background: loading || usernameStatus === 'taken' ? `${t.accent}60` : t.accent, color: '#060912', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: loading || usernameStatus === 'taken' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: `0 8px 24px ${t.accentBg}` }}>
            {loading ? 'Saving...' : 'Save Changes →'}
          </button>
        </div>
      </div>
    </div>
  )
}