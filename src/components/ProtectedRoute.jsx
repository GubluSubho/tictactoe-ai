import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../context/ThemeContext'

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const { t } = useTheme()
  const [checking, setChecking] = useState(true)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/auth')
      } else if (!user.emailVerified) {
        navigate('/auth')
      } else {
        setOk(true)
      }
      setChecking(false)
    })
    return () => unsub()
  }, [])

  if (checking) {
    return (
      <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.accent, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!ok) return null
  return children
}