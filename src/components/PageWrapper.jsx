import { useTheme } from '../context/ThemeContext'

export default function PageWrapper({ children, style = {}, center = false }) {
  const { t } = useTheme()
  return (
    <div style={{
      background: t.bg,
      minHeight: '100vh',
      color: t.text,
      fontFamily: 'DM Sans, sans-serif',
      transition: 'background 0.3s ease, color 0.3s ease',
      ...(center ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
      } : {
        padding: '5rem 1.5rem 3rem',
      }),
      ...style,
    }}>
      {children}
    </div>
  )
}