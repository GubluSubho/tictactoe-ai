import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import SettingsBar from './SettingsBar'
import { sounds } from '../utils/sounds'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('')
  const { user } = useAuth()
  const { t } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user) {
      if (user.displayName) setUsername(user.displayName)
      get(ref(db, `users/${user.uid}`)).then(snap => {
        if (snap.exists()) {
          setUsername(snap.val().username)
          setAvatar(snap.val().avatar || '')
        }
      })
    } else {
      setUsername('')
      setAvatar('')
    }
  }, [user])

  const handleLogout = async () => {
    sounds.click()
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '0.85rem 2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all 0.3s ease',
      background: scrolled ? t.navBg : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? `1px solid ${t.border}` : 'none',
    }}>

      {/* Logo */}
      <div onClick={() => { sounds.click(); navigate('/') }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '30px', height: '30px' }}>
          {[...Array(9)].map((_, i) => (
            <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? t.accent : t.border }} />
          ))}
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: t.text, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
          TTTAI
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        <SettingsBar />

        {user === undefined ? (
          <div style={{ width: '100px', height: '34px', borderRadius: '8px', background: t.card, animation: 'shimmer 1.5s ease-in-out infinite' }} />
        ) : user ? (
          <>
            <div onClick={() => { sounds.click(); navigate('/profile', { state: { from: '/' } }) }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accentBorder; e.currentTarget.style.background = t.accentBg }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.accentBg, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: avatar ? '0.9rem' : '0.65rem', color: t.accent, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                {avatar || (username ? username[0].toUpperCase() : '?')}
              </div>
              <span style={{ color: t.text, fontSize: '0.82rem', fontWeight: 500 }}>{username || '...'}</span>
            </div>

            <button onClick={() => { sounds.click(); navigate('/select') }} style={{ background: t.accent, border: 'none', color: '#060912', padding: '0.5rem 1.1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Play
            </button>

            <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'DM Sans, sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
              Log out
            </button>
          </>
        ) : (
          <button onClick={() => { sounds.click(); navigate('/auth') }} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.text, padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.background = t.card }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = 'transparent' }}>
            Log in
          </button>
        )}
      </div>

      <style>{`@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
    </nav>
  )
}