import { useNavigate } from 'react-router-dom'

export default function ModeSelect() {
  const navigate = useNavigate()

  return (
    <div style={screenStyle}>
      <button
        onClick={() => navigate('/')}
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

      <div style={{
        position: 'fixed', width: '500px', height: '500px', borderRadius: '50%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(200,240,74,0.04) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      }} />

      <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '36px', height: '36px', marginBottom: '0.75rem' }}>
          {[...Array(9)].map((_, i) => (
            <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? '#c8f04a' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>TTTAI</h1>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', margin: 0 }}>Choose how you want to play</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '380px', position: 'relative' }}>

        {/* vs AI */}
        <button
          onClick={() => navigate('/game')}
          style={modeCardStyle}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(200,240,74,0.4)'
            e.currentTarget.style.background = 'rgba(200,240,74,0.05)'
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(200,240,74,0.1)', border: '1px solid rgba(200,240,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>🧠</div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'white', marginBottom: '4px' }}>Play vs AI</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Challenge the Minimax algorithm. Choose Easy, Medium, or Hard difficulty.</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#c8f04a', background: 'rgba(200,240,74,0.08)', border: '1px solid rgba(200,240,74,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>vs AI</div>
        </button>

        {/* Local Multiplayer */}
        <button
          onClick={() => navigate('/multiplayer')}
          style={modeCardStyle}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(126,242,200,0.4)'
            e.currentTarget.style.background = 'rgba(126,242,200,0.04)'
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(126,242,200,0.08)', border: '1px solid rgba(126,242,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>👥</div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'white', marginBottom: '4px' }}>Local Multiplayer</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Two players, one device. Pass and play with a friend.</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#7ef2c8', background: 'rgba(126,242,200,0.08)', border: '1px solid rgba(126,242,200,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>2 Players</div>
        </button>

        {/* Online Multiplayer */}
<button
  onClick={() => navigate('/online')}
  style={modeCardStyle}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'
    e.currentTarget.style.background = 'rgba(251,191,36,0.04)'
    e.currentTarget.style.transform = 'translateY(-3px)'
    e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
  }}
>
  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>🌐</div>
  <div style={{ textAlign: 'left', flex: 1 }}>
    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'white', marginBottom: '4px' }}>
      Online Battle
      <span style={{ marginLeft: '8px', fontSize: '0.62rem', background: 'rgba(200,240,74,0.1)', border: '1px solid rgba(200,240,74,0.2)', color: '#c8f04a', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>NEW</span>
    </div>
    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Play against others online. Choose board size 3×3 to 10×10. Create or join a room.</div>
  </div>
  <div style={{ fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>Online</div>
</button>

        {/* Leaderboard link */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <button
            onClick={() => navigate('/leaderboard')}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0.4rem 0.75rem', borderRadius: '8px', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#fbbf24'
              e.currentTarget.style.background = 'rgba(251,191,36,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            🏆 View Global Leaderboard
          </button>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>
    </div>
  )
}

const screenStyle = {
  background: '#060912', minHeight: '100vh',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative',
}

const backBtnStyle = {
  position: 'absolute', top: '1.5rem', left: '1.5rem',
  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem',
  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
}

const modeCardStyle = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px', padding: '1.5rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '1rem',
  transition: 'all 0.25s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  textAlign: 'left', width: '100%',
}