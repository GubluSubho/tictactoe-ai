import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkWinner } from '../game/minimax'

// ── Minimax with tree building ──
const buildTree = (board, isMaximizing, alpha, beta, depth, maxDepth) => {
  const result = checkWinner(board)
  if (result) {
    return {
      score: result.winner === 'O' ? 10 - depth : result.winner === 'X' ? depth - 10 : 0,
      children: [], board: [...board], depth, terminal: true,
      winner: result.winner,
    }
  }
  if (depth >= maxDepth) {
    return { score: 0, children: [], board: [...board], depth, terminal: true, winner: null }
  }

  const children = []
  let best = isMaximizing ? -Infinity : Infinity

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const newBoard = [...board]
      newBoard[i] = isMaximizing ? 'O' : 'X'
      const child = buildTree(newBoard, !isMaximizing, alpha, beta, depth + 1, maxDepth)
      child.move = i
      children.push(child)

      if (isMaximizing) {
        best = Math.max(best, child.score)
        alpha = Math.max(alpha, best)
      } else {
        best = Math.min(best, child.score)
        beta = Math.min(beta, best)
      }
      if (beta <= alpha) break
    }
  }

  return {
    score: best, children, board: [...board],
    depth, terminal: false, winner: null,
    isMaximizing,
  }
}

const scoreColor = (score) => {
  if (score > 0) return '#c8f04a'
  if (score < 0) return '#ef4444'
  return '#fbbf24'
}

const scoreLabel = (score) => {
  if (score > 0) return `+${score}`
  return `${score}`
}

// ── Mini board display ──
function MiniBoard({ board, move, highlight }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
      gap: '2px', width: '60px', height: '60px',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight ? 'rgba(200,240,74,0.4)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '8px', padding: '3px', flexShrink: 0,
    }}>
      {board.map((cell, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '3px',
          background: i === move ? 'rgba(200,240,74,0.1)' : 'transparent',
          fontSize: '9px', fontWeight: 700,
          fontFamily: 'Syne, sans-serif',
          color: cell === 'X' ? '#c8f04a' : cell === 'O' ? '#7ef2c8' : 'transparent',
        }}>
          {cell || '·'}
        </div>
      ))}
    </div>
  )
}

// ── Tree node component ──
function TreeNode({ node, depth, maxVisible, onHover, hoveredNode, path }) {
  if (depth > maxVisible) return null
  const isHovered = hoveredNode === path
  const hasChildren = node.children && node.children.length > 0
  const color = scoreColor(node.score)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '0', position: 'relative',
    }}>
      {/* Node */}
      <div
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover(null)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '4px', cursor: 'pointer', padding: '6px',
          borderRadius: '12px', transition: 'all 0.2s ease',
          background: isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: isHovered ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
        }}
      >
        <MiniBoard board={node.board} move={node.move} highlight={isHovered} />
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '0.75rem', color,
          background: `rgba(${color === '#c8f04a' ? '200,240,74' : color === '#ef4444' ? '239,68,68' : '251,191,36'},0.1)`,
          border: `1px solid rgba(${color === '#c8f04a' ? '200,240,74' : color === '#ef4444' ? '239,68,68' : '251,191,36'},0.25)`,
          padding: '2px 8px', borderRadius: '6px', minWidth: '36px', textAlign: 'center',
        }}>
          {scoreLabel(node.score)}
        </div>
        {node.terminal && node.winner && (
          <div style={{
            fontSize: '0.6rem', color: node.winner === 'O' ? '#c8f04a' : node.winner === 'X' ? '#ef4444' : '#fbbf24',
            fontWeight: 600, letterSpacing: '0.05em',
          }}>
            {node.winner === 'draw' ? 'DRAW' : `${node.winner} WINS`}
          </div>
        )}
        {depth === 0 && (
          <div style={{
            fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Root
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && depth < maxVisible && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Vertical line down */}
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
          {/* Horizontal line */}
          {node.children.length > 1 && (
            <div style={{
              height: '1px',
              width: `${node.children.length * 96}px`,
              background: 'rgba(255,255,255,0.1)',
              position: 'relative',
            }} />
          )}
          {/* Children row */}
          <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start' }}>
            {node.children.map((child, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                <TreeNode
                  node={child}
                  depth={depth + 1}
                  maxVisible={maxVisible}
                  onHover={onHover}
                  hoveredNode={hoveredNode}
                  path={`${path}-${i}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Interactive board ──
function InteractiveBoard({ board, onCellClick, currentTurn }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
      gap: '8px', width: '100%', maxWidth: '260px',
      padding: '12px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
    }}>
      {board.map((cell, i) => (
        <button
          key={i}
          onClick={() => onCellClick(i)}
          style={{
            width: '100%', aspectRatio: '1', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: cell ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            if (!cell) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
            }
          }}
          onMouseLeave={e => {
            if (!cell) {
              e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }
          }}
        >
          {cell === 'X' && (
            <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
              <line x1="12" y1="12" x2="40" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round" />
              <line x1="40" y1="12" x2="12" y2="40" stroke="#c8f04a" strokeWidth="5" strokeLinecap="round" />
            </svg>
          )}
          {cell === 'O' && (
            <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="16" stroke="#7ef2c8" strokeWidth="5" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main Visualizer ──
export default function Visualizer() {
  const navigate = useNavigate()

  const [board, setBoard] = useState(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [result, setResult] = useState(null)
  const [tree, setTree] = useState(null)
  const [maxDepth, setMaxDepth] = useState(2)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [showTree, setShowTree] = useState(false)
  const [nodeCount, setNodeCount] = useState(0)

  const countNodes = (node) => {
    if (!node) return 0
    return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0)
  }

  const handleCellClick = useCallback((i) => {
    if (board[i] || !isPlayerTurn || result) return
    const newBoard = [...board]
    newBoard[i] = 'X'
    setBoard(newBoard)

    const res = checkWinner(newBoard)
    if (res) { setResult(res); setTree(null); setShowTree(false); return }

    // Build tree from AI perspective
    const aiTree = buildTree(newBoard, true, -Infinity, Infinity, 0, maxDepth)
    setTree(aiTree)
    setNodeCount(countNodes(aiTree))
    setShowTree(true)
    setIsPlayerTurn(false)

    // AI plays best move
    setTimeout(() => {
      let bestScore = -Infinity
      let bestMove = null
      for (let j = 0; j < 9; j++) {
        if (!newBoard[j]) {
          const testBoard = [...newBoard]
          testBoard[j] = 'O'
          const score = aiTree.children.find(c => c.move === j)?.score ?? -Infinity
          if (score > bestScore) { bestScore = score; bestMove = j }
        }
      }
      if (bestMove !== null) {
        const afterAI = [...newBoard]
        afterAI[bestMove] = 'O'
        setBoard(afterAI)
        const res2 = checkWinner(afterAI)
        if (res2) { setResult(res2); setTree(null); setShowTree(false) }
        else setIsPlayerTurn(true)
      }
    }, 1200)
  }, [board, isPlayerTurn, result, maxDepth])

  const reset = () => {
    setBoard(Array(9).fill(null))
    setIsPlayerTurn(true)
    setResult(null)
    setTree(null)
    setShowTree(false)
    setNodeCount(0)
  }

  const getStatus = () => {
    if (result) {
      if (result.winner === 'draw') return "It's a Draw!"
      if (result.winner === 'X') return 'You Win!'
      return 'AI Wins!'
    }
    if (!isPlayerTurn) return 'AI is thinking...'
    return 'Your turn — make a move'
  }

  const getStatusColor = () => {
    if (!result) return isPlayerTurn ? '#c8f04a' : '#7ef2c8'
    if (result.winner === 'draw') return '#fbbf24'
    if (result.winner === 'X') return '#c8f04a'
    return '#7ef2c8'
  }

  return (
    <div style={{
      background: '#060912', minHeight: '100vh',
      fontFamily: 'DM Sans, sans-serif',
      padding: '5rem 1.5rem 3rem',
    }}>

      {/* Back */}
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

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{
            color: '#a082ff', fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Educational Tool
          </p>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: 'white',
            letterSpacing: '-0.02em', margin: '0 0 0.75rem',
          }}>
            Minimax Visualizer
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem',
            maxWidth: '480px', margin: '0 auto', lineHeight: 1.65,
          }}>
            Play as X. After each move, watch the AI evaluate every possible future state using the Minimax algorithm with Alpha-Beta pruning.
          </p>
        </div>

        {/* Controls row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap',
        }}>
          {/* Depth control */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '0.5rem 1rem',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              Tree Depth:
            </span>
            {[1, 2, 3].map(d => (
              <button
                key={d}
                onClick={() => { setMaxDepth(d); reset() }}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '0.82rem', transition: 'all 0.2s',
                  background: maxDepth === d ? '#c8f04a' : 'rgba(255,255,255,0.06)',
                  color: maxDepth === d ? '#060912' : 'rgba(255,255,255,0.4)',
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Node count */}
          {nodeCount > 0 && (
            <div style={{
              background: 'rgba(160,130,255,0.08)',
              border: '1px solid rgba(160,130,255,0.2)',
              borderRadius: '10px', padding: '0.5rem 1rem',
              fontSize: '0.78rem', color: '#a082ff',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontWeight: 700 }}>{nodeCount}</span> nodes evaluated
            </div>
          )}

          {/* Reset */}
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              padding: '0.5rem 1rem', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.82rem',
              transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            ↺ Reset Board
          </button>
        </div>

        {/* Main layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '2rem', alignItems: 'flex-start',
        }}>

          {/* Left — game board + status */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '1.25rem',
          }}>

            {/* Legend */}
            <div style={{
              display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {[
                { sign: 'X', label: 'You', color: '#c8f04a' },
                { sign: 'O', label: 'AI', color: '#7ef2c8' },
              ].map(p => (
                <div key={p.sign} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                }}>
                  <span style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    color: p.color, fontSize: '0.85rem',
                  }}>
                    {p.sign}
                  </span>
                  = {p.label}
                </div>
              ))}
            </div>

            <InteractiveBoard
              board={board}
              onCellClick={handleCellClick}
              currentTurn={isPlayerTurn ? 'X' : 'O'}
            />

            {/* Status */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px', padding: '0.6rem 1.25rem',
              fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'Syne, sans-serif',
              color: getStatusColor(),
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'color 0.3s ease',
            }}>
              {!isPlayerTurn && !result && (
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#7ef2c8', display: 'inline-block',
                  animation: 'pulse 1s infinite',
                }} />
              )}
              {getStatus()}
            </div>

            {result && (
              <button
                onClick={reset}
                style={{
                  background: '#c8f04a', color: '#060912',
                  border: 'none', padding: '0.75rem 2rem',
                  borderRadius: '10px', fontSize: '0.9rem',
                  fontWeight: 700, fontFamily: 'Syne, sans-serif',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#d4f55e'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#c8f04a'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Play Again →
              </button>
            )}

            {/* Score legend */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '1rem',
              width: '100%', maxWidth: '260px',
            }}>
              <p style={{
                fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                margin: '0 0 0.75rem', fontWeight: 600,
              }}>
                Score Legend
              </p>
              {[
                { color: '#c8f04a', label: 'Positive', desc: 'AI winning position' },
                { color: '#ef4444', label: 'Negative', desc: 'Player winning position' },
                { color: '#fbbf24', label: 'Zero', desc: 'Draw / neutral' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '6px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: s.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, minWidth: '56px' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — tree visualization */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '1.5rem',
            minHeight: '400px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            overflow: 'auto',
          }}>
            {!showTree ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '350px', gap: '1rem',
              }}>
                <div style={{ fontSize: '3rem', opacity: 0.3 }}>📊</div>
                <p style={{
                  color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem',
                  textAlign: 'center', maxWidth: '280px', lineHeight: 1.6,
                }}>
                  Make your first move on the board to see the Minimax decision tree appear here.
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  width: '100%', maxWidth: '280px',
                }}>
                  {[
                    'Each node shows a possible board state',
                    'Scores show how good each position is for the AI',
                    'AI picks the path with the highest score',
                    'Alpha-Beta pruning cuts branches that cannot improve the result',
                  ].map((tip, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)',
                    }}>
                      <span style={{ color: '#a082ff', flexShrink: 0 }}>→</span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem',
                }}>
                  <p style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '0.9rem', color: 'white', margin: 0,
                  }}>
                    Decision Tree
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '0.78rem', marginLeft: '8px' }}>
                      depth {maxDepth} · {nodeCount} nodes
                    </span>
                  </p>
                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}>
                    Hover nodes to inspect
                  </div>
                </div>

                {/* Explanation banner */}
                <div style={{
                  background: 'rgba(160,130,255,0.06)',
                  border: '1px solid rgba(160,130,255,0.15)',
                  borderRadius: '10px', padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: '#a082ff', fontWeight: 600 }}>AI (O) maximizes score</span>
                  {' · '}
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>You (X) minimizes score</span>
                  {' · '}
                  Alpha-Beta pruning skips branches that cannot affect the final result
                </div>

                {/* Tree scroll area */}
                <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
                  <div style={{ display: 'inline-flex', justifyContent: 'center', minWidth: '100%' }}>
                    {tree && (
                      <TreeNode
                        node={tree}
                        depth={0}
                        maxVisible={maxDepth}
                        onHover={setHoveredNode}
                        hoveredNode={hoveredNode}
                        path="root"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.75); }
        }
      `}</style>
    </div>
  )
}

const backBtnStyle = {
  position: 'fixed', top: '1.5rem', left: '1.5rem',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  padding: '0.5rem 1rem', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.85rem',
  transition: 'all 0.2s ease', zIndex: 10,
  fontFamily: 'DM Sans, sans-serif',
}