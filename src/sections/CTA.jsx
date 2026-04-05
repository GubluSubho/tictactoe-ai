import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function CTA() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <section style={{ padding: '6rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '24px', padding: '4rem 2rem',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(200,240,74,0.04) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }} />

        <p style={{
          color: '#c8f04a', fontSize: '0.72rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: '1.5rem', position: 'relative',
        }}>
          Get Started
        </p>

        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white',
          lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '1rem',
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', position: 'relative',
        }}>
          Ready to face<br />
          <span style={{ color: '#c8f04a' }}>the machine?</span>
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.4)', fontSize: '1rem',
          fontWeight: 300, lineHeight: 1.6, marginBottom: '2.5rem',
          maxWidth: '380px', margin: '0 auto 2.5rem', position: 'relative',
        }}>
          {user
            ? `Welcome back, ${user.displayName || 'challenger'}. Ready for another round?`
            : 'Join thousands of players. Test your strategy. Beat — or tie — a perfect AI.'
          }
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', flexWrap: 'wrap', position: 'relative',
        }}>
          <button
            onClick={() => navigate(user ? '/select' : '/auth')}
            style={{
              background: '#c8f04a', color: '#060912',
              border: 'none', padding: '0.9rem 2.25rem',
              borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
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
            {user ? '▶ \u00a0Play Now' : '▶ \u00a0Play Now — It\'s Free'}
          </button>

          {!user && (
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: 'transparent', color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.9rem 2.25rem', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Create Account
            </button>
          )}
        </div>

        {!user && (
          <p style={{
            color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem',
            marginTop: '1.5rem', position: 'relative',
          }}>
            No credit card required · Free forever plan available
          </p>
        )}
      </div>
    </section>
  )
}