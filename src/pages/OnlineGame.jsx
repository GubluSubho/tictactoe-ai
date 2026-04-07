import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, onValue, set, get, push } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { calculateElo, DEFAULT_ELO, getRank } from '../utils/elo'

const checkWinnerDynamic = (board, size, winLength) => {
  const getCell = (r, c) => r >= 0 && r < size && c >= 0 && c < size ? board[r * size + c] : null
  const directions = [[0,1],[1,0],[1,1],[1,-1]]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = getCell(r, c)
      if (!cell) continue
      for (const [dr, dc] of directions) {
        let count = 1
        const line = [[r, c]]
        while (count < winLength) {
          const nr = r + dr * count, nc = c + dc * count
          if (getCell(nr, nc) !== cell) break
          line.push([nr, nc])
          count++
        }
        if (count >= winLength) return { winner: cell, line: line.map(([lr, lc]) => lr * size + lc) }
      }
    }
  }
  if (board.every(c => c !== null)) return { winner: 'draw', line: [] }
  return null
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

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`)
    const unsub = onValue(roomRef, snap => {
      if (!snap.exists()) { setError('Room not found.'); setLoading(false); return }
      const data = snap.val()
      setRoom(data)
      if (data.players?.X?.uid === user.uid) setMySign('X')
      else if (data.players?.O?.uid === user.uid) setMySign('O')
      setLoading(false)

      // Process ELO when game finishes
      if (data.status === 'finished' && !processedResult.current && data.result) {
        processedResult.current = true
        handleGameEnd(data)
      }
    })

    // Track spectators
    const spectRef = ref(db, `rooms/${roomId}/spectators`)
    const spectUnsub = onValue(spectRef, snap => {
      setSpectatorCount(snap.exists() ? Object.keys(snap.val()).length : 0)
    })

    return () => { unsub(); spectUnsub() }
  }, [roomId, user.uid])

  const handleGameEnd = async (data) => {
    const { result, players, boardSize, winLength, board, moves } = data
    if (!result || !players?.X || !players?.O) return

    const xUid = players.X.uid
    const oUid = players.O.uid
    const xElo = players.X.elo || DEFAULT_ELO
    const oElo = players.O.elo || DEFAULT_ELO

    let xOutcome, oOutcome
    if (result.winner === 'X') { xOutcome = 'win'; oOutcome = 'loss' }
    else if (result.winner === 'O') { xOutcome = 'loss'; oOutcome = 'win' }
    else { xOutcome = 'draw'; oOutcome = 'draw' }

    const xEloResult = calculateElo(xElo, oElo, xOutcome)
    const oEloResult = calculateElo(oElo, xElo, oOutcome)

    // Update ELO for both players
    try {
      const xSnap = await get(ref(db, `users/${xUid}/elo`))
      const oSnap = await get(ref(db, `users/${oUid}/elo`))
      const currentXElo = xSnap.exists() ? xSnap.val() : DEFAULT_ELO
      const currentOElo = oSnap.exists() ? oSnap.val() : DEFAULT_ELO

      const newXElo = calculateElo(currentXElo, currentOElo, xOutcome).newElo
      const newOElo = calculateElo(currentOElo, currentXElo, oOutcome).newElo

      await set(ref(db, `users/${xUid}/elo`), newXElo)
      await set(ref(db, `users/${oUid}/elo`), newOElo)

      // Update leaderboard
      const [xProfile, oProfile] = await Promise.all([
        get(ref(db, `users/${xUid}`)),
        get(ref(db, `users/${oUid}`)),
      ])

      if (xProfile.exists()) {
        const xData = xProfile.val()
        const xScores = xData.scores || { wins: 0, losses: 0, draws: 0 }
        await set(ref(db, `leaderboard/${xUid}`), {
          username: xData.username, elo: newXElo,
          wins: xScores.wins + (xOutcome === 'win' ? 1 : 0),
          losses: xScores.losses + (xOutcome === 'loss' ? 1 : 0),
          draws: xScores.draws + (xOutcome === 'draw' ? 1 : 0),
          total: (xScores.wins + xScores.losses + xScores.draws) + 1,
          winRate: Math.round(((xScores.wins + (xOutcome === 'win' ? 1 : 0)) / ((xScores.wins + xScores.losses + xScores.draws) + 1)) * 100),
          lastPlayed: Date.now(),
        })
      }

      // Show ELO change for current user
      if (user.uid === xUid) setEloChange(xEloResult.change)
      else if (user.uid === oUid) setEloChange(oEloResult.change)

      // Save replay
      await set(ref(db, `replays/${roomId}`), {
        roomId, boardSize, winLength,
        players: { X: players.X, O: players.O },
        moves: moves || [],
        result, createdAt: Date.now(),
        xEloChange: xEloResult.change,
        oEloChange: oEloResult.change,
      })
    } catch (err) {
      console.error('ELO update failed:', err)
    }
  }

  const handleCellClick = useCallback(async (i) => {
    if (!room || !mySign) return
    if (room.status !== 'playing') return
    if (room.board[i]) return
    const currentSign = room.xIsNext ? 'X' : 'O'
    if (currentSign !== mySign) return

    const newBoard = [...room.board]
    newBoard[i] = mySign
    const result = checkWinnerDynamic(newBoard, room.boardSize, room.winLength)
    const newMoves = [...(room.moves || []), { index: i, sign: mySign, timestamp: Date.now() }]

    await set(ref(db, `rooms/${roomId}`), {
      ...room,
      board: newBoard,
      xIsNext: !room.xIsNext,
      moves: newMoves,
      ...(result ? { status: 'finished', result } : {}),
    })
  }, [room, mySign, roomId])

  const copyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const text = `I just played on TTTAI! ${room?.result?.winner === mySign ? '🏆 I won!' : room?.result?.winner === 'draw' ? "🤝 It's a draw!" : '😤 I lost but I\'ll be back!'} Come challenge me at tictactoe-ai-theta.vercel.app`
    if (navigator.share) {
      navigator.share({ title: 'TTTAI Match Result', text, url: window.location.origin })
    } else {
      navigator.clipboard.writeText(text)
      setShareVisible(true)
      setTimeout(() => setShareVisible(false), 3000)
    }
  }

  if (loading) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ color: '#f87171' }}>{error}</p>
      <button onClick={() => navigate('/online')} style={{ background: '#c8f04a', color: '#060912', border: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Back to Lobby</button>
    </div>
  )

  if (!room) return null

  const { board, boardSize, winLength, status, xIsNext, players, result } = room
  const currentSign = xIsNext ? 'X' : 'O'
  const isMyTurn = currentSign === mySign
  const opponentSign = mySign === 'X' ? 'O' : 'X'
  const opponentName = players?.[opponentSign]?.username || 'Opponent'
  const cellSize = Math.max(36, Math.min(72, Math.floor(300 / boardSize)))

  const getStatus = () => {
    if (status === 'waiting') return 'Waiting for opponent...'
    if (status === 'finished') {
      if (result?.winner === 'draw') return "It's a Draw!"
      if (result?.winner === mySign) return 'You Win! 🎉'
      return `${opponentName} Wins!`
    }
    return isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`
  }

  const getStatusColor = () => {
    if (status !== 'finished') return isMyTurn ? '#c8f04a' : '#7ef2c8'
    if (result?.winner === 'draw') return '#fbbf24'
    if (result?.winner === mySign) return '#c8f04a'
    return '#ef4444'
  }

  const myElo = players?.[mySign]?.elo || DEFAULT_ELO
  const opponentElo = players?.[opponentSign]?.elo || DEFAULT_ELO
  const myRank = getRank(myElo)
  const opponentRank = getRank(opponentElo)

  return (
    <div style={{ background: '#060912', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>

      {/* Top left */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => navigate('/online')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
          ← Leave
        </button>
        <button onClick={() => navigate(`/spectate/${roomId}`)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
          👁 {spectatorCount > 0 ? spectatorCount : ''} Spectators
        </button>
      </div>

      {/* Top right */}
      <button onClick={copyCode} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}>
        {copied ? '✓ Copied!' : `# ${roomId}`}
      </button>

      {/* Logo */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>TTTAI</h1>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem' }}>Online Battle · {boardSize}×{boardSize}</p>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { sign: 'X', data: players?.X, isMe: mySign === 'X', rank: mySign === 'X' ? myRank : opponentRank, active: xIsNext && status === 'playing' },
          { sign: 'O', data: players?.O, isMe: mySign === 'O', rank: mySign === 'O' ? myRank : opponentRank, active: !xIsNext && status === 'playing' },
        ].map(p => (
          <div key={p.sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: p.active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '0.6rem 1rem', transition: 'all 0.3s ease', minWidth: '130px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.15)`, border: `1px solid rgba(${p.sign === 'X' ? '200,240,74' : '126,242,200'},0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: p.sign === 'X' ? '#c8f04a' : '#7ef2c8' }}>
              {p.data?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: p.isMe ? (p.sign === 'X' ? '#c8f04a' : '#7ef2c8') : 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {p.data?.username || (status === 'waiting' && !p.isMe ? 'Waiting...' : '?')}
                {p.isMe && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>(you)</span>}
              </div>
              <div style={{ fontSize: '0.65rem', color: p.rank.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                {p.rank.icon} {p.rank.title} · {p.data?.elo || DEFAULT_ELO}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.5rem 1.25rem' }}>
        {status === 'playing' && !isMyTurn && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7ef2c8', display: 'inline-block', animation: 'pulse 1s infinite' }} />}
        {status === 'waiting' && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pulse 1s infinite' }} />}
        <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: getStatusColor() }}>{getStatus()}</span>
      </div>

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`, gap: '4px', padding: '12px', background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
        {board.map((cell, i) => {
          const isWin = result?.line?.includes(i)
          return (
            <button key={i} onClick={() => handleCellClick(i)} style={{ width: `${cellSize}px`, height: `${cellSize}px`, borderRadius: Math.max(4, cellSize / 8) + 'px', border: isWin ? '1.5px solid rgba(200,240,74,0.4)' : '1px solid rgba(255,255,255,0.07)', background: isWin ? 'rgba(200,240,74,0.08)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cell || !isMyTurn || status !== 'playing' ? 'default' : 'pointer', transition: 'all 0.15s ease', transform: isWin ? 'scale(1.04)' : 'scale(1)' }}
              onMouseEnter={e => { if (!cell && isMyTurn && status === 'playing') { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
              onMouseLeave={e => { if (!cell) { e.currentTarget.style.background = isWin ? 'rgba(200,240,74,0.08)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = isWin ? 'rgba(200,240,74,0.4)' : 'rgba(255,255,255,0.07)' } }}>
              {cell === 'X' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/><line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round"/></svg>}
              {cell === 'O' && <svg width={cellSize * 0.55} height={cellSize * 0.55} viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5"/></svg>}
            </button>
          )
        })}
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
        {boardSize}×{boardSize} · {winLength} in a row to win
      </p>

      {/* Game end */}
      {status === 'finished' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>

          {/* ELO change */}
          {eloChange !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: eloChange >= 0 ? 'rgba(200,240,74,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${eloChange >= 0 ? 'rgba(200,240,74,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '12px', padding: '0.65rem 1.25rem' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: eloChange >= 0 ? '#c8f04a' : '#ef4444' }}>
                {eloChange >= 0 ? '+' : ''}{eloChange} ELO
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                · New rating: {(players?.[mySign]?.elo || DEFAULT_ELO) + eloChange}
              </span>
            </div>
          )}

          {/* Share result */}
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
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.75)}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-8px);opacity:1}}
      `}</style>
    </div>
  )
}