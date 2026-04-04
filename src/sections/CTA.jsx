export default function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto relative">

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl px-8 py-20 text-center relative overflow-hidden">

          {/* Glow */}
          <div className="absolute w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(200,240,74,0.05) 0%, transparent 70%)',
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
            }}
          />

          {/* Label */}
          <p className="text-[#c8f04a] text-xs font-medium tracking-widest uppercase mb-6 relative">
            Get Started
          </p>

          {/* Heading */}
          <h2 className="font-black text-white leading-none tracking-tight mb-4 relative"
            style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            Ready to face<br />
            <span style={{ color: '#c8f04a' }}>the machine?</span>
          </h2>

          {/* Subtitle */}
          <p className="text-white/40 text-base font-light leading-relaxed mb-10 max-w-sm mx-auto relative">
            Join thousands of players. Test your strategy. Beat — or tie — a perfect AI.
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap relative">
            <button className="bg-[#c8f04a] text-[#060912] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#d4f55e] transition-all duration-200 hover:-translate-y-0.5 text-sm">
              ▶ &nbsp;Play Now — It's Free
            </button>
            <button className="border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-sm">
              Create Account
            </button>
          </div>

          {/* Bottom note */}
          <p className="text-white/20 text-xs mt-8 relative">
            No credit card required &nbsp;·&nbsp; Free forever plan available
          </p>

        </div>
      </div>
    </section>
  )
}