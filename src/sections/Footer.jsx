import { useTheme } from '../context/ThemeContext'

export default function Footer() {
  const { t } = useTheme()
  return (
    <footer style={{ borderTop: `1px solid ${t.border}`, padding: '2.5rem 2rem', transition: 'all 0.3s ease' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '28px', height: '28px' }}>
            {[...Array(9)].map((_, i) => (
              <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? t.accent : t.border }} />
            ))}
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: t.text, fontSize: '1rem', letterSpacing: '-0.02em' }}>TTTAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {[{ label: 'Privacy Policy', href: '#' }, { label: 'Terms of Service', href: '#' }, { label: 'GitHub', href: '#' }, { label: 'Contact', href: '#' }].map(link => (
            <a key={link.label} href={link.href} style={{ color: t.textFaint, textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = t.textMuted}
              onMouseLeave={e => e.target.style.color = t.textFaint}>
              {link.label}
            </a>
          ))}
        </div>
        <p style={{ color: t.textFaint, fontSize: '0.75rem', margin: 0 }}>© 2025 TTTAI. All rights reserved.</p>
      </div>
    </footer>
  )
}