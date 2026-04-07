export const DEFAULT_ELO = 1000
export const K_FACTOR = 32

export const calculateElo = (playerElo, opponentElo, outcome) => {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const score = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0
  const newElo = Math.round(playerElo + K_FACTOR * (score - expected))
  return { newElo, change: newElo - playerElo }
}

export const getRank = (elo) => {
  if (elo >= 2000) return { title: 'Grandmaster', color: '#fbbf24', icon: '👑' }
  if (elo >= 1800) return { title: 'Master', color: '#c8f04a', icon: '💎' }
  if (elo >= 1600) return { title: 'Expert', color: '#7ef2c8', icon: '🔷' }
  if (elo >= 1400) return { title: 'Advanced', color: '#a082ff', icon: '⚡' }
  if (elo >= 1200) return { title: 'Intermediate', color: '#60a5fa', icon: '🔵' }
  return { title: 'Beginner', color: 'rgba(255,255,255,0.4)', icon: '⚪' }
}