import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-8 py-4 flex items-center justify-between transition-all duration-300 ${
      scrolled
        ? 'bg-[#060912]/90 backdrop-blur-xl border-b border-white/5'
        : 'bg-transparent'
    }`}>

      <div className="flex items-center gap-3">
        <div className="grid grid-cols-3 gap-[3px] w-8 h-8">
          <span className="rounded-sm bg-[#c8f04a]" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-[#c8f04a]" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-white/10" />
          <span className="rounded-sm bg-[#c8f04a]" />
        </div>
        <span className="font-bold text-white text-lg tracking-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}>
          TTT-AI
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-white/50 hover:text-white text-sm transition-colors duration-200">Features</a>
        <a href="#difficulty" className="text-white/50 hover:text-white text-sm transition-colors duration-200">Difficulty</a>
        <a href="#multiplayer" className="text-white/50 hover:text-white text-sm transition-colors duration-200">Multiplayer</a>
      </div>

      <button className="border border-white/10 hover:border-white/20 hover:bg-white/5 text-white text-sm px-5 py-2 rounded-lg transition-all duration-200">
        Log in
      </button>

    </nav>
  )
}