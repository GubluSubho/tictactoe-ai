import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [username, setUsername] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user) {
      get(ref(db, `users/${user.uid}`)).then(snap => {
        if (snap.exists()) setUsername(snap.val().username)
      })
    } else {
      setUsername('')
    }
  }, [user])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'all 0.3s',
      background: scrolled ? 'rgba(6,9,18,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
    }}>

      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '32px', height: '32px' }}>
          <span style={{ borderRadius: '2px', background: '#c8f04a' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: '#c8f04a' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ borderRadius: '2px', background: '#c8f04a' }} />
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'white', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          TTT-AI
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <a href="#features" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = 'white'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
          Features
        </a>
        <a href="#difficulty" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = 'white'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
          Difficulty
        </a>
      </div>

      {/* Auth area */}
      {user === undefined ? (
        // Still loading auth state — show nothing
        <div style={{ width: '80px' }} />
      ) : user ? (
        // Logged in
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
  onClick={() => navigate('/profile', { state: { from: '/' } })}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '0.4rem 0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = 'rgba(200,240,74,0.3)'
    e.currentTarget.style.background = 'rgba(200,240,74,0.06)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
  }}
>
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: 'rgba(200,240,74,0.15)',
              border: '1px solid rgba(200,240,74,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem',
              color: '#c8f04a',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
            }}>
              {username ? username[0].toUpperCase() : '?'}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 500 }}>
              {username || 'Player'}
            </span>
          </div>
          <button
            onClick={() => navigate('/game')}
            style={{
              background: '#c8f04a',
              border: 'none',
              color: '#060912',
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#d4f55e'}
            onMouseLeave={e => e.currentTarget.style.background = '#c8f04a'}
          >
            Play
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            Log out
          </button>
        </div>
      ) : (
        // Not logged in
        <button
          onClick={() => navigate('/auth')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Log in
        </button>
      )}
    </nav>
  )
}