export default function Board({ board, onCellClick, winLine }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      width: '100%',
      maxWidth: '340px',
      padding: '14px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '24px',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      {board.map((cell, i) => {
        const isWin = winLine && winLine.includes(i)
        return (
          <button
            key={i}
            onClick={() => onCellClick(i)}
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '14px',
              border: isWin
                ? '1.5px solid rgba(200,240,74,0.4)'
                : '1px solid rgba(255,255,255,0.07)',
              background: isWin
                ? 'linear-gradient(145deg, rgba(200,240,74,0.1), rgba(200,240,74,0.04))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: cell ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              transform: isWin ? 'scale(1.04)' : 'scale(1)',
              boxShadow: isWin
                ? '0 8px 24px rgba(200,240,74,0.1), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => {
              if (!cell) {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
              }
            }}
            onMouseLeave={e => {
              if (!cell) {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
              }
            }}
          >
            {cell === 'X' && <XMark />}
            {cell === 'O' && <OMark />}
          </button>
        )
      })}
    </div>
  )
}

function XMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
      <line x1="12" y1="12" x2="40" y2="40"
        stroke="#c8f04a" strokeWidth="7" strokeLinecap="round" />
      <line x1="40" y1="12" x2="12" y2="40"
        stroke="#c8f04a" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

function OMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="16"
        stroke="#7ef2c8" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}