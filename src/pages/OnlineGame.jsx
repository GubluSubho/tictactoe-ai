import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, onValue, update, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { calculateElo, DEFAULT_ELO, getRank } from '../utils/elo'
import { sounds } from '../utils/sounds'
import { useTheme } from '../context/ThemeContext'

// ── Winner detection ──
const checkWinnerDynamic = (board, size, winLength) => {
  const getCell = (r, c) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return null
    const val = board[r * size + c]
    return val === undefined ? null : val
  }
  const directions = [[0,1],[1,0],[1,1],[1,-1]]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = getCell(r, c)
      if (!cell) continue
      for (const [dr, dc] of directions) {
        let count = 1
        const line = [[r, c]]
        while (count < winLength) {
          const nr = r + dr * count
          const nc = c + dc * count
          if (getCell(nr, nc) !== cell) break
          line.push([nr, nc])
          count++
        }
        if (count >= winLength) {
          return { winner: cell, line: line.map(([lr, lc]) => lr * size + lc) }
        }
      }
    }
  }
  if (board.every(c => c !== null && c !== undefined && c !== '')) return { winner: 'draw', line: [] }
  return null
}

// ── KEY FIX: Convert board to Firebase-safe object that preserves all cells ──
const boardToFirebase = (board) => {
  const obj = {}
  board.forEach((cell, i) => {
    obj[String(i)] = cell === null ? '' : cell
  })
  return obj
}

// ── Normalize board from Firebase back to array ──
const boardFromFirebase = (raw, size) => {
  const total = size * size
  const arr = Array(total).fill(null)
  if (!raw) return arr
  if (Array.isArray(raw)) {
    for (let i = 0; i < total; i++) {
      arr[i] = raw[i] ? raw[i] : null
    }
    return arr
  }
  // Firebase object format
  for (let i = 0; i < total; i++) {
    const val = raw[String(i)]
    arr[i] = (val && val !== '') ? val : null
  }
  return arr
}

export default function OnlineGame() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { user } = useAuth()
  const { t } = useTheme()

  const [room, setRoom] = useState(null)
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [mySign, setMySign] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [eloChange, setEloChange] = useState(null)
  const [shareVisible, setShareVisible] = useState(false)
  const [spectatorCount, setSpectatorCount] = useState(0)

  const processedResult = useRef(false)
  const mySignRef = useRef(null)
  const roomRef = useRef(null)

  useEffect(() => {
    if (!user?.uid || !roomId) return

    roomRef.current = ref(db, `rooms/${roomId}`)

    const unsub = onValue(roomRef.current, snap => {
      if (!snap.exists()) {
        setError('Room not found or has been closed.')
        setLoading(false)
        return
      }

      const raw = snap.val()
      const boardSize = raw.boardSize || 3

      // Normalize board — this is the critical fix
      const normalizedBoard = boardFromFirebase(raw.board, boardSize)

      // Determine my sign
      let sign = null
      if (raw.players?.X?.uid === user.uid) sign = 'X'
      else if (raw.players?.O?.uid === user.uid) sign = 'O'

      setMySign(sign)
      mySignRef.current = sign

      // Store room without board (board stored separately)
      setRoom({ ...raw, boardSize })
      setBoard(normalizedBoard)
      setLoading(false)

      // Process ELO when game finishes — only once
      if (raw.status === 'finished' && raw.result && !processedResult.current) {
        processedResult.current = true
        handleGameEnd({ ...raw, board: normalizedBoard }).catch(console.error)
      }
    })

    // Spectator count
    const spectUnsub = onValue(ref(db, `rooms/${roomId}/spectators`), snap => {
      setSpectatorCount(snap.exists() ? Object.keys(snap.val()).length : 0)
    })

    return () => { unsub(); spectUnsub() }
  }, [roomId, user?.uid])

  const handleGameEnd = async (data) => {
    const { result, players } = data
    if (!result || !players?.X?.uid || !players?.O?.uid) return

    const xUid = players.X.uid
    const oUid = players.O.uid
    let xOutcome, oOutcome
    if (result.winner === 'X') { xOutcome = 'win'; oOutcome = 'loss' }
    else if (result.winner === 'O') { xOutcome = 'loss'; oOutcome = 'win' }
    else { xOutcome = 'draw'; oOutcome = 'draw' }

    try {
      const [xEloSnap, oEloSnap, xProfileSnap, oProfileSnap] = await Promise.all([
        get(ref(db, `users/${xUid}/elo`)),
        get(ref(db, `users/${oUid}/elo`)),
        get(ref(db, `users/${xUid}`)),
        get(ref(db, `users/${oUid}`)),
      ])

      const currentXElo = xEloSnap.exists() ? xEloSnap.val() : DEFAULT_ELO
      const currentOElo = oEloSnap.exists() ? oEloSnap.val() : DEFAULT_ELO
      const xResult = calculateElo(currentXElo, currentOElo, xOutcome)
      const oResult = calculateElo(currentOElo, currentXElo, oOutcome)

      await Promise.all([
        update(ref(db, `users/${xUid}`), { elo: xResult.newElo }),
        update(ref(db, `users/${oUid}`), { elo: oResult.newElo }),
      ])

      const updateLb = async (uid, profileSnap, elo, outcome) => {
        if (!profileSnap.exists()) return
        const d = profileSnap.val()
        const s = d.scores || { wins: 0, losses: 0, draws: 0 }
        const nw = s.wins + (outcome === 'win' ? 1 : 0)
        const nl = s.losses + (outcome === 'loss' ? 1 : 0)
        const nd = s.draws + (outcome === 'draw' ? 1 : 0)
        const tot = nw + nl + nd
        await update(ref(db, `leaderboard/${uid}`), {
          username: d.username || 'Player',
          avatar: d.avatar || '',
          elo,
          wins: nw, losses: nl, draws: nd, total: tot,
          winRate: tot > 0 ? Math.round((nw / tot) * 100) : 0,
          lastPlayed: Date.now(),
        })
      }

      await Promise.all([
        updateLb(xUid, xProfileSnap, xResult.newElo, xOutcome),
        updateLb(oUid, oProfileSnap, oResult.newElo, oOutcome),
      ])

      // Save replay — convert board back to array for storage
      await update(ref(db, `replays/${roomId}`), {
        roomId,
        boardSize: data.boardSize,
        winLength: data.winLength,
        players: { X: data.players.X, O: data.players.O },
        moves: data.moves || [],
        result: data.result,
        createdAt: Date.now(),
        xEloChange: xResult.change,
        oEloChange: oResult.change,
      })

      if (user.uid === xUid) {
        setEloChange(xResult.change)
        xOutcome === 'win' ? sounds.win() : xOutcome === 'loss' ? sounds.lose() : sounds.draw()
      } else if (user.uid === oUid) {
        setEloChange(oResult.change)
        oOutcome === 'win' ? sounds.win() : oOutcome === 'loss' ? sounds.lose() : sounds.draw()
      }
    } catch (err) {
      console.error('ELO update failed:', err)
    }
  }

  const handleCellClick = useCallback(async (i) => {
    if (!room || !mySignRef.current) return
    if (room.status !== 'playing') return
    if (board[i]) return
    const currentSign = room.xIsNext ? 'X' : 'O'
    if (currentSign !== mySignRef.current) return

    sounds.place()

    // Build new board
    const newBoard = [...board]
    newBoard[i] = mySignRef.current

    const result = checkWinnerDynamic(newBoard, room.boardSize, room.winLength)
    const newMoves = [...(room.moves || []), {
      index: i, sign: mySignRef.current, timestamp: Date.now(),
    }]

    // KEY FIX: Use Firebase update() with path-based updates instead of set()
    // This avoids overwriting the entire room and losing data
    // Convert board to object so Firebase preserves ALL cells including null ones
    const firebaseBoard = boardToFirebase(newBoard)

    const updates = {
      [`rooms/${roomId}/board`]: firebaseBoard,
      [`rooms/${roomId}/xIsNext`]: !room.xIsNext,
      [`rooms/${roomId}/moves`]: newMoves,
    }

    if (result) {
      updates[`rooms/${roomId}/status`] = 'finished'
      updates[`rooms/${roomId}/result`] = result
    }

    try {
      await update(ref(db), updates)
    } catch (err) {
      console.error('Move failed:', err)
    }
  }, [room, board, roomId])

  const copyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    sounds.click()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    if (!room) return
    const won = room.result?.winner === mySign
    const draw = room.result?.winner === 'draw'
    const text = `I just played on TTTAI! ${won ? '🏆 I won!' : draw ? "🤝 Draw!" : '😤 Rematch incoming!'} → ${window.location.origin}`
    if (navigator.share) {
      navigator.share({ title: 'TTTAI Match Result', text, url: window.location.origin })
    } else {
      navigator.clipboard.writeText(text)
      setShareVisible(true)
      setTimeout(() => setShareVisible(false), 3000)
    }
  }

  if (loading) return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Connecting...</p>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', fontFamily: 'DM Sans, sans-serif', padding: '2rem' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <p style={{ color: '#f87171', fontSize: '1rem', textAlign: 'center' }}>{error}</p>
      <button onClick={() => navigate('/online')} style={{ background: t.accent, color: t.accentText, border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Back to Lobby</button>
    </div>
  )

  if (!room || board.length === 0) return null

  const { boardSize = 3, winLength = 3, status, xIsNext, players, result, moves = [] } = room
  const currentSign = xIsNext ? 'X' : 'O'
  const isMyTurn = mySign !== null && currentSign === mySign
  const opponentSign = mySign === 'X' ? 'O' : 'X'
  const opponentName = players?.[opponentSign]?.username || 'Opponent'
  const cellSize = Math.max(34, Math.min(72, Math.floor(300 / boardSize)))
  const xElo = players?.X?.elo || DEFAULT_ELO
  const oElo = players?.O?.elo || DEFAULT_ELO
  const xRank = getRank(xElo)
  const oRank = getRank(oElo)

  const getStatus = () => {
    if (status === 'waiting') return 'Waiting for opponent...'
    if (status === 'finished') {
      if (result?.winner === 'draw') return "It's a Draw!"
      if (result?.winner === mySign) return 'You Win! 🎉'
      return `${opponentName} Wins!`
    }
    if (mySign === null) return 'Spectating'
    return isMyTurn ? `Your Turn (${mySign})` : `${opponentName}'s Turn (${currentSign})`
  }

  const getStatusColor = () => {
    if (status === 'waiting') return '#fbbf24'
    if (status !== 'finished') return isMyTurn ? t.accent : t.teal
    if (result?.winner === 'draw') return '#fbbf24'
    if (result?.winner === mySign) return t.accent
    return t.danger
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1.5rem 2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative', transition: 'background 0.3s ease' }}>

      {/* Top left buttons */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
        <button onClick={() => navigate('/online')} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted }}>
          ← Leave
        </button>
        <button onClick={() => navigate(`/spectate/${roomId}`)} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.textFaint, padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.color = t.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textFaint }}>
          👁 {spectatorCount > 0 ? spectatorCount : ''} Spectators
        </button>
      </div>

      {/* Room code */}
      <button onClick={copyCode} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 10, background: t.amberBg, border: `1px solid ${t.amberBorder}`, color: t.amber, padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        {copied ? '✓ Copied!' : `# ${roomId}`}
      </button>

      {/* Logo */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: t.text, letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>TTTAI</h1>
        <p style={{ color: t.textFaint, fontSize: '0.72rem', margin: 0 }}>Online Battle · {boardSize}×{boardSize} · {winLength} in a row</p>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['X', 'O'].map(sign => {
          const pData = players?.[sign]
          const rank = sign === 'X' ? xRank : oRank
          const elo = sign === 'X' ? xElo : oElo
          const isMe = mySign === sign
          const isActive = (xIsNext ? sign === 'X' : sign === 'O') && status === 'playing'
          return (
            <div key={sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isActive ? t.card : t.inputBg, border: `1px solid ${isActive ? t.borderHover : t.border}`, borderRadius: '12px', padding: '0.6rem 1rem', transition: 'all 0.3s ease', minWidth: '130px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: sign === 'X' ? t.accentBg : t.tealBg, border: `1px solid ${sign === 'X' ? t.accentBorder : t.tealBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: pData?.avatar ? '1rem' : '0.9rem', color: sign === 'X' ? t.accent : t.teal }}>
                {pData?.avatar || pData?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isMe ? (sign === 'X' ? t.accent : t.teal) : t.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {pData?.username || (status === 'waiting' && !isMe ? 'Waiting...' : '?')}
                  {isMe && <span style={{ fontSize: '0.6rem', color: t.textFaint }}>(you)</span>}
                </div>
                <div style={{ fontSize: '0.65rem', color: rank.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {rank.icon} {rank.title} · {elo} ELO
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '0.5rem 1.25rem', minHeight: '42px' }}>
        {((status === 'playing' && !isMyTurn) || status === 'waiting') && (
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: getStatusColor(), display: 'inline-block', animation: 'pulse 1s infinite' }} />
        )}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: getStatusColor() }}>
          {getStatus()}
        </span>
      </div>

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`, gap: '4px', padding: '12px', background: t.gradientBoard, border: `1px solid ${t.border}`, borderRadius: '20px', boxShadow: t.shadow }}>
        {board.map((cell, i) => {
          const isWin = result?.line?.includes(i)
          const canClick = !cell && isMyTurn && status === 'playing'
          return (
            <button key={i} onClick={() => canClick && handleCellClick(i)}
              style={{ width: `${cellSize}px`, height: `${cellSize}px`, borderRadius: Math.max(4, Math.floor(cellSize / 8)) + 'px', border: isWin ? `1.5px solid ${t.accentBorder}` : `1px solid ${t.border}`, background: isWin ? t.accentBg : t.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canClick ? 'pointer' : 'default', transition: 'all 0.15s ease', transform: isWin ? 'scale(1.05)' : 'scale(1)' }}
              onMouseEnter={e => { if (canClick) { e.currentTarget.style.background = t.card; e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.transform = 'scale(1.03)' } }}
              onMouseLeave={e => { if (canClick) { e.currentTarget.style.background = t.inputBg; e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = 'scale(1)' } }}>
              {cell === 'X' && (
                <svg width={Math.floor(cellSize * 0.55)} height={Math.floor(cellSize * 0.55)} viewBox="0 0 52 52" fill="none">
                  <line x1="12" y1="12" x2="40" y2="40" stroke={t.accent} strokeWidth="5" strokeLinecap="round"/>
                  <line x1="40" y1="12" x2="12" y2="40" stroke={t.accent} strokeWidth="5" strokeLinecap="round"/>
                </svg>
              )}
              {cell === 'O' && (
                <svg width={Math.floor(cellSize * 0.55)} height={Math.floor(cellSize * 0.55)} viewBox="0 0 52 52" fill="none">
                  <circle cx="26" cy="26" r="16" stroke={t.teal} strokeWidth="5"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: t.textFaint, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
        {boardSize}×{boardSize} · {winLength} in a row · {moves.length} moves
      </p>

      {/* Game end */}
      {status === 'finished' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          {eloChange !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: eloChange >= 0 ? t.accentBg : t.dangerBg, border: `1px solid ${eloChange >= 0 ? t.accentBorder : t.dangerBorder}`, borderRadius: '12px', padding: '0.65rem 1.25rem' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: eloChange >= 0 ? t.accent : t.danger }}>
                {eloChange >= 0 ? '+' : ''}{eloChange} ELO
              </span>
              <span style={{ fontSize: '0.75rem', color: t.textMuted }}>
                New rating: {(players?.[mySign]?.elo || DEFAULT_ELO) + eloChange}
              </span>
            </div>
          )}

          {shareVisible && (
            <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '10px', padding: '0.65rem 1.25rem', fontSize: '0.8rem', color: t.accent }}>
              ✓ Copied to clipboard!
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate('/online')} style={{ background: t.accent, color: t.accentText, border: 'none', padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 8px 24px ${t.accentBg}` }}
              onMouseEnter={e => { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'translateY(0)' }}>
              Play Again →
            </button>
            <button onClick={() => navigate(`/replay/${roomId}`)} style={{ background: t.purpleBg, border: `1px solid ${t.purpleBorder}`, color: t.purple, padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}>
              📽 Replay
            </button>
            <button onClick={handleShare} style={{ background: t.card, border: `1px solid ${t.border}`, color: t.text, padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = t.cardHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = t.card; e.currentTarget.style.transform = 'translateY(0)' }}>
              🔗 Share
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.75)}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}
      `}</style>
    </div>
  )
}