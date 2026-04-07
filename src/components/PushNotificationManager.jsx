import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'

const INACTIVITY_DELAY = 12000 // 12 seconds

const MESSAGES = [
  { title: '♟️ Your skills are rusting!', body: 'Challenge the AI — can you beat Hard mode today?' },
  { title: '🏆 Someone just climbed the leaderboard', body: 'Log in and defend your ranking!' },
  { title: '🧠 The AI is ready for a rematch', body: 'Come back and test the Minimax algorithm.' },
  { title: '🎯 Quick game?', body: 'A 3×3 battle takes less than 2 minutes. You in?' },
  { title: '📊 Your stats are waiting', body: 'Check your win rate and climb the global leaderboard.' },
  { title: '⚡ Challenge a friend', body: 'Create an online room and share the code with someone.' },
]

let notificationSent = false

export default function PushNotificationManager() {
  const { user } = useAuth()
  const location = useLocation()
  const timerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  const resetTimer = () => {
    lastActivityRef.current = Date.now()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!user || notificationSent) return
    if (!('Notification' in window)) return

    timerRef.current = setTimeout(async () => {
      const inactiveFor = Date.now() - lastActivityRef.current
      if (inactiveFor < INACTIVITY_DELAY - 1000) return

      if (Notification.permission === 'granted') {
        const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        new Notification(msg.title, {
          body: msg.body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        })
        notificationSent = true
        setTimeout(() => { notificationSent = false }, 5 * 60 * 1000)
      } else if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }, INACTIVITY_DELAY)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user])

  useEffect(() => {
    resetTimer()
  }, [location.pathname])

  return null
}