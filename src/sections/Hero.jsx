import { useEffect, useRef } from 'react'
import Board3D from '../components/Board3D'
import { useNavigate } from 'react-router-dom'

export default function Hero() {
  const navigate = useNavigate()
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)'
        }}
      />

      {/* Glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,240,74,0.06) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-[#c8f04a]/10 border border-[#c8f04a]/20 text-[#c8f04a] px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-8 relative">
        <span className="w-1.5 h-1.5 rounded-full bg-[#c8f04a] animate-pulse" />
        Minimax Algorithm Powered
      </div>

      {/* Heading */}
      <h1 className="font-black leading-none tracking-tight mb-6 relative"
        style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}>
        <span className="block text-white">Tic Tac Toe</span>
        <span className="block" style={{ color: '#c8f04a' }}>meets AI</span>
      </h1>

      {/* Subtitle */}
      <p className="text-white/50 text-lg max-w-md leading-relaxed mb-10 relative font-light">
        Play against an unbeatable AI powered by Minimax. Challenge friends online, track your stats, and watch the AI think in real time.
      </p>

      {/* CTA Buttons */}
      <div className="flex items-center gap-4 flex-wrap justify-center relative mb-16">
        <button
          onClick={() => navigate('/auth')}
          className="bg-[#c8f04a] text-[#060912] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#d4f55e] transition-all duration-200 hover:-translate-y-0.5 text-sm">
          ▶ &nbsp;Play Now
        </button>
        <button
          onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
          className="border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-sm">
          View Features
        </button>
      </div>

      {/* 3D Board */}
      <div style={{ width: '500px', maxWidth: '90vw', position: 'relative' }}>
        <Board3D />
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '-1rem',
          background: '#0d1220',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#7ef2c8',
            display: 'inline-block',
            animation: 'pulse 1.5s infinite'
          }} />
          AI is thinking...
        </div>
      </div>

    </section>
  )
}