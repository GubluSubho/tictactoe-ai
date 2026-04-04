// Board is an array of 9 elements: 'X', 'O', or null

export const checkWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],             // diagonals
  ]

  for (let [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] }
    }
  }

  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: [] }
  }

  return null
}

const minimax = (board, isMaximizing, alpha, beta, depth) => {
  const result = checkWinner(board)

  if (result) {
    if (result.winner === 'O') return 10 - depth
    if (result.winner === 'X') return depth - 10
    return 0
  }

  if (isMaximizing) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O'
        best = Math.max(best, minimax(board, false, alpha, beta, depth + 1))
        board[i] = null
        alpha = Math.max(alpha, best)
        if (beta <= alpha) break
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X'
        best = Math.min(best, minimax(board, true, alpha, beta, depth + 1))
        board[i] = null
        beta = Math.min(beta, best)
        if (beta <= alpha) break
      }
    }
    return best
  }
}

export const getBestMove = (board, difficulty) => {
  // Easy: 80% random
  if (difficulty === 'easy') {
    const empty = board.map((v, i) => v === null ? i : null).filter(v => v !== null)
    if (Math.random() < 0.8) return empty[Math.floor(Math.random() * empty.length)]
  }

  // Medium: 50% random
  if (difficulty === 'medium') {
    const empty = board.map((v, i) => v === null ? i : null).filter(v => v !== null)
    if (Math.random() < 0.5) return empty[Math.floor(Math.random() * empty.length)]
  }

  // Hard: full minimax
  let bestScore = -Infinity
  let bestMove = null

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O'
      const score = minimax(board, false, -Infinity, Infinity, 0)
      board[i] = null
      if (score > bestScore) {
        bestScore = score
        bestMove = i
      }
    }
  }

  return bestMove
}