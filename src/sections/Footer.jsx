export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2.5rem 2rem' }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '28px', height: '28px' }}>
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
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'white', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            TTTAI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.85rem' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            Privacy Policy
          </a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.85rem' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            Terms of Service
          </a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.85rem' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            GitHub
          </a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.85rem' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            Contact
          </a>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', margin: 0 }}>
          © 2025 TTTAI. All rights reserved.
        </p>

      </div>
    </footer>
  )
}