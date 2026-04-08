import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, onValue, set, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { calculateElo, DEFAULT_ELO, getRank } from '../utils/elo'
import { sounds } from '../utils/sounds'

// ── Winner detection for any board size ──
const checkWinnerDynamic = (board, size, winLength) => {
  const getCell = (r, c) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return null
    return board[r * size + c] ?? null
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
  if (board.every(c => c !== null && c !== undefined)) return { winner: 'draw', line: [] }
  return null
}

// ── Normalize board from Firebase (object → array) ──
const normalizeBoard = (board, size) => {
  if (!board) return Array(size * size).fill(null)
  if (Array.isArray(board)) return board.map(c => c ?? null)
  const arr = Array(size * size).fill(null)
  Object.entries(board).forEach(([k, v]) => { arr[parseInt(k)] = v ?? null })
  return arr
}

export default function OnlineGame() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { user } = useAuth()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mySign, setMySign] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [eloChange, setEloChange] = useState(null)
  const [shareVisible, setShareVisible] = useState(false)
  const [spectatorCount, setSpectatorCount] = useState(0)

  const processedResult = useRef(false)
  const mySignRef = useRef(null)

  useEffect(() => {
    if (!user?.uid || !roomId) return

    const roomRef = ref(db, `rooms/${roomId}`)
    const unsub = onValue(roomRef, snap => {
      if (!snap.exists()) {
        setError('Room not found or has been closed.')
        setLoading(false)
        return
      }

      const raw = snap.val()

      // Normalize board — Firebase converts arrays to objects
      const boardSize = raw.boardSize || 3
      const normalizedBoard = normalizeBoard(raw.board, boardSize)

      const data = { ...raw, board: normalizedBoard }
      setRoom(data)

      // Determine my sign
      let sign = null
      if (raw.players?.X?.uid === user.uid) sign = 'X'
      else if (raw.players?.O?.uid === user.uid) sign = 'O'
      setMySign(sign)
      mySignRef.current = sign

      setLoading(false)

      // Process ELO when game finishes — only once
      if (data.status === 'finished' && data.result && !processedResult.current) {
        processedResult.current = true
        handleGameEnd(data).catch(console.error)
      }
    })

    // Spectator count
    const spectRef = ref(db, `rooms/${roomId}/spectators`)
    const spectUnsub = onValue(spectRef, snap => {
      setSpectatorCount(snap.exists() ? Object.keys(snap.val()).length : 0)
    })

    return () => {
      unsub()
      spectUnsub()
    }
  }, [roomId, user?.uid])

  const handleGameEnd = async (data) => {
    const { result, players, boardSize, winLength, moves } = data
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
        set(ref(db, `users/${xUid}/elo`), xResult.newElo),
        set(ref(db, `users/${oUid}/elo`), oResult.newElo),
      ])

      // Update leaderboard
      const updateLeaderboard = async (uid, profile, elo, outcome) => {
        if (!profile.exists()) return
        const d = profile.val()
        const scores = d.scores || { wins: 0, losses: 0, draws: 0 }
        const newWins = scores.wins + (outcome === 'win' ? 1 : 0)
        const newLosses = scores.losses + (outcome === 'loss' ? 1 : 0)
        const newDraws = scores.draws + (outcome === 'draw' ? 1 : 0)
        const total = newWins + newLosses + newDraws
        await set(ref(db, `leaderboard/${uid}`), {
          username: d.username || 'Player',
          avatar: d.avatar || '',
          elo,
          wins: newWins,
          losses: newLosses,
          draws: newDraws,
          total,
          winRate: total > 0 ? Math.round((newWins / total) * 100) : 0,
          lastPlayed: Date.now(),
        })
      }

      await Promise.all([
        updateLeaderboard(xUid, xProfileSnap, xResult.newElo, xOutcome),
        updateLeaderboard(oUid, oProfileSnap, oResult.newElo, oOutcome),
      ])

      // Save replay
      await set(ref(db, `replays/${roomId}`), {
        roomId, boardSize, winLength,
        players: { X: players.X, O: players.O },
        moves: moves || [],
        result,
        createdAt: Date.now(),
        xEloChange: xResult.change,
        oEloChange: oResult.change,
      })

      // Show ELO change for current user
      if (user.uid === xUid) {
        setEloChange(xResult.change)
        if (xOutcome === 'win') sounds.win()
        else if (xOutcome === 'loss') sounds.lose()
        else sounds.draw()
      } else if (user.uid === oUid) {
        setEloChange(oResult.change)
        if (oOutcome === 'win') sounds.win()
        else if (oOutcome === 'loss') sounds.lose()
        else sounds.draw()
      }
    } catch (err) {
      console.error('ELO update failed:', err)
    }
  }

  const handleCellClick = useCallback(async (i) => {
    if (!room || !mySignRef.current) return
    if (room.status !== 'playing') return
    if (room.board[i]) return

    const currentSign = room.xIsNext ? 'X' : 'O'
    if (currentSign !== mySignRef.current) return

    sounds.place()

    const newBoard = [...room.board]
    newBoard[i] = mySignRef.current

    const result = checkWinnerDynamic(newBoard, room.boardSize, room.winLength)
    const newMoves = [...(room.moves || []), {
      index: i, sign: mySignRef.current, timestamp: Date.now(),
    }]

    const update = {
      ...room,
      board: newBoard,
      xIsNext: !room.xIsNext,
      moves: newMoves,
      ...(result ? { status: 'finished', result } : {}),
    }

    try {
      await set(ref(db, `rooms/${roomId}`), update)
    } catch (err) {
      console.error('Failed to update room:', err)
    }
  }, [room, roomId])

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
    const text = `I just played on TTTAI! ${won ? '🏆 I won!' : draw ? "🤝 It's a draw!" : '😤 I lost but I\'ll be back!'} Come challenge me → ${window.location.origin}`
    if (navigator.share) {
      navigator.share({ title: 'TTTAI Match Result', text, url: window.location.origin })
    } else {
      navigator.clipboard.writeText(text)
      setShareVisible(true)
      setTimeout(() => setShareVisible(false), 3000)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 }}>Connecting to room...</p>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', fontFamily: 'DM Sans, sans-serif', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: '#f87171', fontSize: '1rem', textAlign: 'center', maxWidth: '320px' }}>{error}</p>
        <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
          Back to Lobby
        </button>
      </div>
    )
  }

  // ── No room data yet ──
  if (!room) return null

  const {
    board,
    boardSize = 3,
    winLength = 3,
    status,
    xIsNext,
    players,
    result,
    moves = [],
  } = room

  const currentSign = xIsNext ? 'X' : 'O'
  const isMyTurn = mySign !== null && currentSign === mySign
  const opponentSign = mySign === 'X' ? 'O' : 'X'
  const opponentName = players?.[opponentSign]?.username || 'Opponent'
  const myName = players?.[mySign]?.username || 'You'

  const cellSize = Math.max(34, Math.min(72, Math.floor(300 / boardSize)))

  const xElo = players?.X?.elo || DEFAULT_ELO
  const oElo = players?.O?.elo || DEFAULT_ELO
  const xRank = getRank(xElo)
  const oRank = getRank(oElo)

  const getStatus = () => {
    if (status === 'waiting') return 'Waiting for opponent to join...'
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
    if (status !== 'finished') return isMyTurn ? '#c8f04a' : '#7ef2c8'
    if (result?.winner === 'draw') return '#fbbf24'
    if (result?.winner === mySign) return '#c8f04a'
    return '#ef4444'
  }

  return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1.5rem 2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>

      {/* Top left */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
        <button onClick={() => navigate('/online')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
          ← Leave
        </button>
        <button onClick={() => navigate(`/spectate/${roomId}`)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
          👁 {spectatorCount > 0 ? spectatorCount : ''} Spectators
        </button>
      </div>

      {/* Room code */}
      <button onClick={copyCode} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}>
        {copied ? '✓ Copied!' : `# ${roomId}`}
      </button>

      {/* Logo */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>TTTAI</h1>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', margin: 0 }}>
          Online Battle · {boardSize}×{boardSize} · {winLength} in a row
        </p>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(['X', 'O']).map(sign => {
          const pData = players?.[sign]
          const rank = sign === 'X' ? xRank : oRank
          const elo = sign === 'X' ? xElo : oElo
          const isMe = mySign === sign
          const isActive = xIsNext ? sign === 'X' : sign === 'O'
          const active = isActive && status === 'playing'

          return (
            <div key={sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '0.6rem 1rem', transition: 'all 0.3s ease', minWidth: '130px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `rgba(${sign === 'X' ? '200,240,74' : '126,242,200'},0.15)`, border: `1px solid rgba(${sign === 'X' ? '200,240,74' : '126,242,200'},0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: pData?.avatar ? '1rem' : '0.9rem', color: sign === 'X' ? '#c8f04a' : '#7ef2c8' }}>
                {pData?.avatar || pData?.username?.[0]?.toUpperCase() || (status === 'waiting' && !isMe ? '?' : '?')}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isMe ? (sign === 'X' ? '#c8f04a' : '#7ef2c8') : 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {pData?.username || (status === 'waiting' && !isMe ? 'Waiting...' : '?')}
                  {isMe && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>(you)</span>}
                </div>
                <div style={{ fontSize: '0.65rem', color: rank.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {rank.icon} {rank.title} · {elo} ELO
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status bar */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.5rem 1.25rem', minHeight: '42px' }}>
        {(status === 'playing' && !isMyTurn) || status === 'waiting' ? (
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: getStatusColor(), display: 'inline-block', animation: 'pulse 1s infinite' }} />
        ) : null}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: getStatusColor() }}>
          {getStatus()}
        </span>
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`,
        gap: '4px', padding: '12px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
      }}>
        {board.map((cell, i) => {
          const isWin = result?.line?.includes(i)
          const canClick = !cell && isMyTurn && status === 'playing'
          return (
            <button
              key={i}
              onClick={() => canClick && handleCellClick(i)}
              style={{
                width: `${cellSize}px`, height: `${cellSize}px`,
                borderRadius: Math.max(4, Math.floor(cellSize / 8)) + 'px',
                border: isWin
                  ? '1.5px solid rgba(200,240,74,0.5)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: isWin
                  ? 'rgba(200,240,74,0.08)'
                  : 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canClick ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                transform: isWin ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseEnter={e => {
                if (canClick) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.transform = 'scale(1.03)'
                }
              }}
              onMouseLeave={e => {
                if (canClick) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
            >
              {cell === 'X' && (
                <svg width={Math.floor(cellSize * 0.55)} height={Math.floor(cellSize * 0.55)} viewBox="0 0 52 52" fill="none">
                  <line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/>
                  <line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/>
                </svg>
              )}
              {cell === 'O' && (
                <svg width={Math.floor(cellSize * 0.55)} height={Math.floor(cellSize * 0.55)} viewBox="0 0 52 52" fill="none">
                  <circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
        {boardSize}×{boardSize} · {winLength} in a row to win · {moves.length} moves played
      </p>

      {/* Game end actions */}
      {status === 'finished' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>

          {/* ELO change */}
          {eloChange !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: eloChange >= 0 ? 'rgba(200,240,74,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${eloChange >= 0 ? 'rgba(200,240,74,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '12px', padding: '0.65rem 1.25rem' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: eloChange >= 0 ? '#c8f04a' : '#ef4444' }}>
                {eloChange >= 0 ? '+' : ''}{eloChange} ELO
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                New rating: {(players?.[mySign]?.elo || DEFAULT_ELO) + eloChange}
              </span>
            </div>
          )}

          {shareVisible && (
            <div style={{ background: 'rgba(200,240,74,0.08)', border: '1px solid rgba(200,240,74,0.2)', borderRadius: '10px', padding: '0.65rem 1.25rem', fontSize: '0.8rem', color: '#c8f04a' }}>
              ✓ Result copied to clipboard!
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 8px 24px rgba(200,240,74,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#d4f55e'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#c8f04a'; e.currentTarget.style.transform = 'translateY(0)' }}>
              Play Again →
            </button>
            <button onClick={() => navigate(`/replay/${roomId}`)} style={{ background: 'rgba(160,130,255,0.1)', border: '1px solid rgba(160,130,255,0.2)', color: '#a082ff', padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,130,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(160,130,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              📽 Watch Replay
            </button>
            <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              🔗 Share Result
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.75)} }
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-8px);opacity:1} }
      `}</style>
    </div>
  )
}