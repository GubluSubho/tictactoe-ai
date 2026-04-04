const levels = [
  {
    level: 'Level 1',
    name: 'Easy',
    desc: 'The AI deliberately plays suboptimal and random moves to ensure a fun, winnable experience for beginners learning the game.',
    algo: 'Random moves',
    labelColor: 'text-[#7ef2c8]',
    borderColor: 'border-[#7ef2c8]/10',
    bgColor: 'bg-[#7ef2c8]/[0.03]',
    algoColor: 'bg-white/5 text-white/50',
    badge: null,
  },
  {
    level: 'Level 2',
    name: 'Medium',
    desc: 'A balanced opponent that mixes optimal and random play. Either side can win — a real back-and-forth challenge for casual players.',
    algo: 'Mixed Minimax',
    labelColor: 'text-yellow-400',
    borderColor: 'border-yellow-400/10',
    bgColor: 'bg-yellow-400/[0.03]',
    algoColor: 'bg-white/5 text-white/50',
    badge: null,
  },
  {
    level: 'Level 3',
    name: 'Hard',
    desc: 'Full Minimax with Alpha-Beta pruning. The AI plays perfectly — it will never lose. Win or draw only. Can you force a tie?',
    algo: 'Optimal Minimax + α–β',
    labelColor: 'text-[#c8f04a]',
    borderColor: 'border-[#c8f04a]/20',
    bgColor: 'bg-[#c8f04a]/[0.04]',
    algoColor: 'bg-[#c8f04a]/10 text-[#c8f04a]',
    badge: 'Unbeatable',
  },
]

export default function Difficulty() {
  return (
    <section id="difficulty" className="py-24 px-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-16">
        <p className="text-[#c8f04a] text-xs font-medium tracking-widest uppercase mb-4">
          Difficulty System
        </p>
        <h2 className="font-black text-white leading-tight tracking-tight mb-4"
          style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          Choose your<br />challenge
        </h2>
        <p className="text-white/40 text-base font-light max-w-md leading-relaxed">
          Three carefully tuned difficulty levels — from a forgiving opponent to a provably unbeatable AI.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {levels.map((l) => (
          <div
            key={l.name}
            className={`relative rounded-2xl p-7 border ${l.bgColor} ${l.borderColor} hover:-translate-y-1 transition-all duration-300 cursor-default`}
          >
            {/* Unbeatable badge */}
            {l.badge && (
              <span className="absolute top-5 right-5 bg-[#c8f04a]/15 text-[#c8f04a] text-[10px] font-semibold px-2.5 py-1 rounded-md tracking-widest uppercase">
                {l.badge}
              </span>
            )}

            <p className={`text-xs font-medium tracking-widest uppercase mb-3 ${l.labelColor}`}>
              {l.level}
            </p>

            <h3 className="text-white font-bold text-2xl mb-3"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              {l.name}
            </h3>

            <p className="text-white/40 text-sm leading-relaxed font-light mb-6">
              {l.desc}
            </p>

            <div className="flex items-center gap-2 text-xs text-white/30">
              <span>Strategy:</span>
              <code className={`px-2 py-0.5 rounded text-xs font-mono ${l.algoColor}`}>
                {l.algo}
              </code>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}