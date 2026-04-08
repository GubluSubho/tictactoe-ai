import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../context/ThemeContext'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { t } = useTheme()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email) return setError('Please enter your email address.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email.')
      else setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '28px', padding: '2.5rem 2.25rem', width: '100%', maxWidth: '400px', boxShadow: t.shadowLg }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '32px', height: '32px', marginBottom: '0.75rem' }}>
            {[...Array(9)].map((_, i) => (
              <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? t.accent : t.border }} />
            ))}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Reset Password</h1>
          <p style={{ color: t.textMuted, fontSize: '0.82rem', margin: 0 }}>
            {sent ? 'Check your inbox' : "We'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ color: t.accent, fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                Password reset email sent to <strong>{email}</strong>. Check your inbox and follow the instructions.
              </p>
            </div>
            <button onClick={() => navigate('/auth')} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none', background: t.accent, color: '#060912', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}>
              Back to Login →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: t.textMuted, marginBottom: '0.35rem', fontWeight: 500 }}>Email Address</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '8px' }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none', background: loading ? `${t.accent}80` : t.accent, color: '#060912', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: `0 8px 24px ${t.accentBg}` }}>
              {loading ? 'Sending...' : 'Send Reset Email →'}
            </button>

            <button onClick={() => navigate('/auth')} style={{ background: 'transparent', border: 'none', color: t.textMuted, fontSize: '0.82rem', cursor: 'pointer', padding: '0.5rem', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline', transition: 'all 0.2s' }}>
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}