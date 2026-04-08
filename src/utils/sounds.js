const AudioContext = window.AudioContext || window.webkitAudioContext

let ctx = null
let enabled = localStorage.getItem('soundEnabled') !== 'false'

const getCtx = () => {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

const playTone = (frequency, duration, type = 'sine', volume = 0.3, delay = 0) => {
  if (!enabled) return
  try {
    const context = getCtx()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay)
    oscillator.type = type
    gainNode.gain.setValueAtTime(0, context.currentTime + delay)
    gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + delay + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + duration)
    oscillator.start(context.currentTime + delay)
    oscillator.stop(context.currentTime + delay + duration)
  } catch {}
}

export const sounds = {
  click: () => playTone(600, 0.08, 'sine', 0.15),
  place: () => {
    playTone(440, 0.1, 'triangle', 0.2)
    playTone(550, 0.08, 'triangle', 0.15, 0.05)
  },
  win: () => {
    playTone(523, 0.15, 'sine', 0.3)
    playTone(659, 0.15, 'sine', 0.3, 0.15)
    playTone(784, 0.15, 'sine', 0.3, 0.3)
    playTone(1047, 0.4, 'sine', 0.3, 0.45)
  },
  lose: () => {
    playTone(392, 0.2, 'sine', 0.3)
    playTone(349, 0.2, 'sine', 0.3, 0.2)
    playTone(294, 0.4, 'sine', 0.3, 0.4)
  },
  draw: () => {
    playTone(440, 0.15, 'sine', 0.25)
    playTone(440, 0.3, 'sine', 0.15, 0.2)
  },
  notification: () => {
    playTone(880, 0.1, 'sine', 0.2)
    playTone(1100, 0.2, 'sine', 0.2, 0.1)
  },
  toggle: () => playTone(700, 0.06, 'sine', 0.1),
}

export const setSoundEnabled = (val) => {
  enabled = val
  localStorage.setItem('soundEnabled', val)
}

export const isSoundEnabled = () => enabled