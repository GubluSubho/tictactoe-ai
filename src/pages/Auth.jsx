import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  signOut,
  reload,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db, googleProvider } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase().trim())
const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u)

const getPasswordStrength = (p) => {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[@$!%*?&_#^]/.test(p)) s++
  return s
}

const validatePassword = (p) => {
  if (p.length < 8) return 'At least 8 characters required.'
  if (!/[A-Z]/.test(p)) return 'Must include an uppercase letter.'
  if (!/[a-z]/.test(p)) return 'Must include a lowercase letter.'
  if (!/\d/.test(p)) return 'Must include a number.'
  if (!/[@$!%*?&_#^]/.test(p)) return 'Must include a special character (@$!%*?&_#^).'
  return null
}

const friendlyError = (code) => {
  const map = {
    'auth/user-not-found': 'No account found with this email or username.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid username/email or password.',
    'auth/invalid-login-credentials': 'Invalid username/email or password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Popup blocked. Please allow popups for this site in your browser settings.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/internal-error': 'An internal error occurred. Please try again.',
  }
  return map[code] || `Something went wrong (${code}). Please try again.`
}

const generateSuggestions = (base) => {
  const clean = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15)
  if (!clean || clean.length < 2) return []
  return [
    `${clean}_${Math.floor(Math.random() * 900 + 100)}`,
    `${clean}${Math.floor(Math.random() * 90 + 10)}`,
    `the_${clean}`,
  ]
}

const strengthColors = ['transparent','#ef4444','#f97316','#eab308','#84cc16','#c8f04a']
const strengthLabels = ['','Very Weak','Weak','Fair','Good','Strong']

function GoogleUsernameSetup({ firebaseUser, onDone }) {
  const { t } = useTheme()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  const checkAvailability = useCallback(async (val) => {
    const clean = val.replace(/\s/g, '')
    if (!clean || clean.length < 3) {
      setStatus(clean.length > 0 ? 'short' : 'idle')
      setSuggestions([])
      return
    }
    if (!isValidUsername(clean)) {
      setStatus('invalid')
      setSuggestions([])
      return
    }
    setStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const snap = await get(ref(db, `usernames/${clean.toLowerCase()}`))
        if (snap.exists()) {
          setStatus('taken')
          const raw = generateSuggestions(clean)
          const results = await Promise.all(
            raw.map(async s => {
              const ss = await get(ref(db, `usernames/${s.toLowerCase()}`))
              return { name: s, ok: !ss.exists() }
            })
          )
          setSuggestions(results.filter(r => r.ok).map(r => r.name))
        } else {
          setStatus('available')
          setSuggestions([])
        }
      } catch {
        setStatus('idle')
      }
    }, 500)
  }, [])

  const handleSave = async () => {
    setError('')
    if (!username.trim()) return setError('Please enter a username.')
    if (!isValidUsername(username)) return setError('3-20 chars, letters/numbers/underscores only.')
    if (status === 'taken') return setError('Username already taken.')
    if (status === 'checking') return setError('Still checking...')
    if (status === 'invalid' || status === 'short') return setError('Invalid username format.')

    setLoading(true)
    try {
      const snap = await get(ref(db, `usernames/${username.toLowerCase()}`))
      if (snap.exists()) {
        setStatus('taken')
        setLoading(false)
        return setError('Username was just taken. Please choose another.')
      }
      await updateProfile(firebaseUser, { displayName: username })
      await set(ref(db, `users/${firebaseUser.uid}`), {
        username,
        email: firebaseUser.email || '',
        avatar: '',
        createdAt: Date.now(),
        scores: { wins: 0, losses: 0, draws: 0 },
        elo: 1000,
      })
      await set(ref(db, `usernames/${username.toLowerCase()}`), firebaseUser.uid)
      toast.success(`Welcome to TTTAI, ${username}!`)
      onDone()
    } catch (err) {
      console.error('GoogleUsernameSetup error:', err)
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const borderColor = status === 'available' ? 'rgba(200,240,74,0.5)'
    : status === 'taken' || status === 'invalid' ? 'rgba(239,68,68,0.4)'
    : t.border

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '28px', padding: '2.5rem 2.25rem', width: '100%', maxWidth: '400px', boxShadow: t.shadowLg }}>
        <LogoMark t={t} />
        <p style={{ color: t.accent, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>One Last Step</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.35rem', textAlign: 'center' }}>Choose a Username</h2>
        <p style={{ color: t.textMuted, fontSize: '0.82rem', textAlign: 'center', margin: '0 0 1.75rem', lineHeight: 1.5 }}>This is your public display name. It must be unique.</p>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input type="text" placeholder="subho_123" value={username} autoFocus maxLength={20}
              onChange={e => { const v = e.target.value.replace(/\s/g, ''); setUsername(v); checkAvailability(v) }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ ...inputBase(t), borderColor }}
              onFocus={e => e.target.style.background = t.cardHover}
              onBlur={e => e.target.style.background = t.inputBg}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>
              {status === 'checking' && <span style={{ color: t.textFaint }}>⟳</span>}
              {status === 'available' && <span style={{ color: t.accent }}>✓</span>}
              {(status === 'taken' || status === 'invalid') && <span style={{ color: '#ef4444' }}>✗</span>}
            </span>
          </div>
          {status === 'available' && <p style={hintStyle('#c8f04a')}>✓ Available</p>}
          {status === 'taken' && <p style={hintStyle('#ef4444')}>✗ Already taken</p>}
          {(status === 'invalid' || status === 'short') && username.length > 0 && <p style={hintStyle('#ef4444')}>3-20 chars, letters/numbers/underscores only</p>}

          {status === 'taken' && suggestions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '0.68rem', color: t.textFaint, margin: '0 0 5px' }}>Available suggestions:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setUsername(s); setStatus('available'); setSuggestions([]) }}
                    style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.28rem 0.7rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.68rem', color: t.textFaint, marginBottom: '1.25rem', lineHeight: 1.5 }}>
          3-20 characters · letters, numbers, underscores only
        </p>

        {error && <ErrorBox msg={error} t={t} />}

        <button onClick={handleSave}
          disabled={loading || status === 'taken' || status === 'invalid' || status === 'checking' || status === 'short'}
          style={{ ...btnPrimary(t), opacity: loading || status === 'taken' || status === 'invalid' || status === 'checking' ? 0.6 : 1, cursor: loading || status === 'taken' || status === 'invalid' || status === 'checking' ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

function EmailVerificationPending({ user }) {
  const { t } = useTheme()
  const navigate = useNavigate()
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [resent, setResent] = useState(false)

  const resendEmail = async () => {
    setResending(true)
    try {
      await sendEmailVerification(user)
      setResent(true)
      toast.success('Verification email sent!')
      setTimeout(() => setResent(false), 5000)
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        toast.error('Too many requests. Wait a moment.')
      } else {
        toast.error('Failed to send. Try again.')
      }
    }
    setResending(false)
  }

  const checkVerified = async () => {
    setChecking(true)
    try {
      await reload(user)
      if (user.emailVerified) {
        toast.success('Email verified! Welcome to TTTAI!')
        navigate('/select')
      } else {
        toast.error('Email not verified yet. Check your inbox.')
      }
    } catch {
      toast.error('Could not check. Try again.')
    }
    setChecking(false)
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const { t: theme } = useTheme()

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: theme.gradientCard, border: `1px solid ${theme.border}`, borderRadius: '28px', padding: '2.5rem 2.25rem', width: '100%', maxWidth: '420px', boxShadow: theme.shadowLg, textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>📧</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: theme.text, letterSpacing: '-0.02em', margin: '0 0 0.75rem' }}>
          Verify Your Email
        </h2>
        <p style={{ color: theme.textMuted, fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 0.5rem' }}>
          We sent a verification link to:
        </p>
        <p style={{ color: theme.accent, fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1.5rem', wordBreak: 'break-all' }}>
          {user?.email}
        </p>
        <p style={{ color: theme.textMuted, fontSize: '0.82rem', lineHeight: 1.65, margin: '0 0 2rem' }}>
          Click the link in your email to verify your account. Check your spam folder if you don't see it.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={checkVerified} disabled={checking}
            style={{ ...btnPrimary(theme), opacity: checking ? 0.6 : 1, cursor: checking ? 'not-allowed' : 'pointer' }}>
            {checking ? 'Checking...' : "I've Verified My Email →"}
          </button>
          <button onClick={resendEmail} disabled={resending || resent}
            style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '0.75rem', borderRadius: '12px', cursor: resending || resent ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', opacity: resending || resent ? 0.6 : 1 }}>
            {resent ? '✓ Email Sent!' : resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: theme.textFaint, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline', padding: '0.5rem' }}>
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTheme()

  const [mode, setMode] = useState('login')
  const [googleUser, setGoogleUser] = useState(null)

  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [usernameSuggestions, setUsernameSuggestions] = useState([])
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)

  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const usernameDebounce = useRef(null)

  useEffect(() => {
    if (user && user.emailVerified) {
      navigate('/select')
    }
  }, [user])

  useEffect(() => {
    setError(''); setSuccessMsg('')
    setSignupUsername(''); setSignupEmail(''); setSignupPassword(''); setSignupConfirm('')
    setUsernameStatus('idle'); setUsernameSuggestions([])
    setLoginId(''); setLoginPw('')
    setPwStrength(0); setShowPw(false); setShowConfirm(false); setShowLoginPw(false)
  }, [mode])

  const checkUsername = useCallback(async (val) => {
    const clean = val.replace(/\s/g, '')
    if (!clean || clean.length < 3) { setUsernameStatus(clean.length > 0 ? 'short' : 'idle'); setUsernameSuggestions([]); return }
    if (!isValidUsername(clean)) { setUsernameStatus('invalid'); setUsernameSuggestions([]); return }
    setUsernameStatus('checking')
    clearTimeout(usernameDebounce.current)
    usernameDebounce.current = setTimeout(async () => {
      try {
        const snap = await get(ref(db, `usernames/${clean.toLowerCase()}`))
        if (snap.exists()) {
          setUsernameStatus('taken')
          const raw = generateSuggestions(clean)
          const results = await Promise.all(raw.map(async s => {
            const ss = await get(ref(db, `usernames/${s.toLowerCase()}`))
            return { name: s, ok: !ss.exists() }
          }))
          setUsernameSuggestions(results.filter(r => r.ok).map(r => r.name))
        } else {
          setUsernameStatus('available')
          setUsernameSuggestions([])
        }
      } catch { setUsernameStatus('idle') }
    }, 500)
  }, [])

  const getEmailFromUsername = async (username) => {
    try {
      const snap = await get(ref(db, `usernames/${username.toLowerCase()}`))
      if (!snap.exists()) return null
      const uid = snap.val()
      const userSnap = await get(ref(db, `users/${uid}`))
      if (!userSnap.exists()) return null
      return userSnap.val().email || null
    } catch { return null }
  }

  const handleSignup = async () => {
    setError('')
    if (!signupUsername.trim()) return setError('Please enter a username.')
    if (!isValidUsername(signupUsername)) return setError('Username: 3-20 chars, letters/numbers/underscores only.')
    if (usernameStatus === 'checking') return setError('Still checking username...')
    if (usernameStatus === 'taken') return setError('Username taken. Choose another.')
    if (usernameStatus === 'invalid' || usernameStatus === 'short') return setError('Invalid username.')
    if (!signupEmail.trim()) return setError('Please enter your email.')
    if (!isValidEmail(signupEmail)) return setError('Please enter a valid email address (e.g. you@example.com).')
    if (!signupPassword) return setError('Please enter a password.')
    const pwErr = validatePassword(signupPassword)
    if (pwErr) return setError(pwErr)
    if (!signupConfirm) return setError('Please confirm your password.')
    if (signupPassword !== signupConfirm) return setError('Passwords do not match.')

    setLoading(true)
    try {
      const snap = await get(ref(db, `usernames/${signupUsername.toLowerCase()}`))
      if (snap.exists()) { setUsernameStatus('taken'); setLoading(false); return setError('Username just taken. Choose another.') }

      const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword)
      await updateProfile(cred.user, { displayName: signupUsername })
      await set(ref(db, `users/${cred.user.uid}`), {
        username: signupUsername,
        email: signupEmail.trim().toLowerCase(),
        avatar: '',
        createdAt: Date.now(),
        scores: { wins: 0, losses: 0, draws: 0 },
        elo: 1000,
      })
      await set(ref(db, `usernames/${signupUsername.toLowerCase()}`), cred.user.uid)

      try { await sendEmailVerification(cred.user) } catch {}

      await signOut(auth)
      setMode('login')
      setSuccessMsg(`Account created! Check your email to verify, then log in.`)
      toast.success('Account created! Please verify your email.')
    } catch (err) {
      console.error('Signup error:', err.code, err.message)
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError('')
    if (!loginId.trim()) return setError('Please enter your username or email.')
    if (!loginPw) return setError('Please enter your password.')

    setLoading(true)
    try {
      let emailToUse = loginId.trim()
      if (!loginId.includes('@')) {
        if (!isValidUsername(loginId.trim()) && loginId.trim().length < 3) {
          setLoading(false)
          return setError('Please enter a valid username or email.')
        }
        const found = await getEmailFromUsername(loginId.trim())
        if (!found) { setLoading(false); return setError('No account found with this username.') }
        emailToUse = found
      }

      const cred = await signInWithEmailAndPassword(auth, emailToUse, loginPw)

      if (!cred.user.emailVerified) {
        toast('Please verify your email first.', { icon: '📧' })
        setLoading(false)
        return
      }

      toast.success('Welcome back!')
      navigate('/select')
    } catch (err) {
      console.error('Login error:', err.code, err.message)
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const fbUser = cred.user

      const userSnap = await get(ref(db, `users/${fbUser.uid}`))
      if (userSnap.exists()) {
        toast.success('Welcome back!')
        navigate('/select')
      } else {
        setGoogleUser(fbUser)
      }
    } catch (err) {
      console.error('Google auth error:', err.code, err.message)
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(friendlyError(err.code))
      }
    }
    setGoogleLoading(false)
  }

  if (user && !user.emailVerified && !googleUser) {
    return <EmailVerificationPending user={user} />
  }

  if (googleUser) {
    return <GoogleUsernameSetup firebaseUser={googleUser} onDone={() => navigate('/select')} />
  }

  const usernameBorder = usernameStatus === 'available' ? 'rgba(200,240,74,0.5)'
    : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'rgba(239,68,68,0.4)'
    : t.border

  const confirmBorder = !signupConfirm ? t.border
    : signupConfirm === signupPassword ? 'rgba(200,240,74,0.4)'
    : 'rgba(239,68,68,0.4)'

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: t.gradientCard, border: `1px solid ${t.border}`, borderRadius: '28px', padding: '2.5rem 2.25rem', width: '100%', maxWidth: '420px', boxShadow: t.shadowLg }}>

        <LogoMark t={t} subtitle={mode === 'login' ? 'Welcome back, challenger' : 'Join the arena'} />

        <div style={{ display: 'flex', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s', background: mode === m ? t.accent : 'transparent', color: mode === m ? t.accentText : t.textMuted }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {successMsg && (
          <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: t.accent, display: 'flex', gap: '8px', lineHeight: 1.5 }}>
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}

        <button onClick={handleGoogle} disabled={loading || googleLoading}
          style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', cursor: loading || googleLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.25rem', transition: 'all 0.2s', opacity: loading || googleLoading ? 0.7 : 1 }}
          onMouseEnter={e => { if (!loading && !googleLoading) { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.background = t.cardHover } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card }}>
          {googleLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', border: `2px solid ${t.textFaint}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Connecting to Google...
            </span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: t.border }} />
          <span style={{ color: t.textFaint, fontSize: '0.72rem' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: t.border }} />
        </div>

        {mode === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={lblStyle(t)}>Username <span style={{ color: t.textFaint, fontSize: '0.68rem' }}>unique · 3-20 chars</span></label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="subho_123" value={signupUsername} maxLength={20}
                  onChange={e => { const v = e.target.value.replace(/\s/g,''); setSignupUsername(v); checkUsername(v) }}
                  style={{ ...inputBase(t), paddingRight: '2.5rem', borderColor: usernameBorder }}
                  onFocus={e => e.target.style.background = t.cardHover}
                  onBlur={e => e.target.style.background = t.inputBg}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  {usernameStatus === 'checking' && <span style={{ color: t.textFaint, fontSize: '0.8rem' }}>⟳</span>}
                  {usernameStatus === 'available' && <span style={{ color: t.accent, fontSize: '0.8rem' }}>✓</span>}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>✗</span>}
                </span>
              </div>
              {usernameStatus === 'available' && <p style={hintStyle(t.accent)}>✓ Available</p>}
              {usernameStatus === 'taken' && <p style={hintStyle('#ef4444')}>✗ Already taken</p>}
              {(usernameStatus === 'invalid' || usernameStatus === 'short') && signupUsername.length > 0 && <p style={hintStyle('#ef4444')}>3-20 chars, letters/numbers/underscores</p>}
              {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.68rem', color: t.textFaint, margin: '0 0 5px' }}>Try one of these:</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {usernameSuggestions.map(s => (
                      <button key={s} onClick={() => { setSignupUsername(s); setUsernameStatus('available'); setUsernameSuggestions([]) }}
                        style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: '0.28rem 0.7rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={lblStyle(t)}>Email Address</label>
              <input type="email" placeholder="you@example.com" value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                style={{ ...inputBase(t), borderColor: signupEmail && !isValidEmail(signupEmail) ? 'rgba(239,68,68,0.4)' : t.border }}
                onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                onBlur={e => { e.target.style.borderColor = signupEmail && !isValidEmail(signupEmail) ? 'rgba(239,68,68,0.4)' : t.border; e.target.style.background = t.inputBg }}
              />
              {signupEmail && !isValidEmail(signupEmail) && <p style={hintStyle('#ef4444')}>Please enter a valid email address</p>}
            </div>

            <div>
              <label style={lblStyle(t)}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={signupPassword}
                  onChange={e => { setSignupPassword(e.target.value); setPwStrength(getPasswordStrength(e.target.value)) }}
                  style={{ ...inputBase(t), paddingRight: '3rem' }}
                  onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                  onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
                />
                <button onClick={() => setShowPw(p => !p)} style={eyeBtn}>{showPw ? '🙈' : '👁'}</button>
              </div>
              {signupPassword.length > 0 && (
                <div style={{ marginTop: '7px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= pwStrength ? strengthColors[pwStrength] : t.border, transition: 'all 0.3s' }} />)}
                  </div>
                  <p style={{ fontSize: '0.68rem', margin: 0, color: pwStrength >= 4 ? '#c8f04a' : pwStrength >= 3 ? '#eab308' : '#ef4444' }}>
                    {strengthLabels[pwStrength]}
                    {pwStrength < 5 && ' · missing: ' + [
                      !(/[A-Z]/.test(signupPassword)) && 'uppercase',
                      !(/[a-z]/.test(signupPassword)) && 'lowercase',
                      !(/\d/.test(signupPassword)) && 'number',
                      !(/[@$!%*?&_#^]/.test(signupPassword)) && 'special char',
                      signupPassword.length < 8 && '8+ chars',
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {signupPassword.length === 0 && <p style={{ fontSize: '0.68rem', color: t.textFaint, margin: '4px 0 0' }}>8+ chars · upper · lower · number · special (@$!%*?&_#^)</p>}
            </div>

            <div>
              <label style={lblStyle(t)}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={signupConfirm}
                  onChange={e => setSignupConfirm(e.target.value)}
                  onPaste={e => e.preventDefault()}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  style={{ ...inputBase(t), paddingRight: '3rem', borderColor: confirmBorder }}
                  onFocus={e => e.target.style.background = t.cardHover}
                  onBlur={e => e.target.style.background = t.inputBg}
                />
                <button onClick={() => setShowConfirm(p => !p)} style={eyeBtn}>{showConfirm ? '🙈' : '👁'}</button>
              </div>
              {signupConfirm && signupConfirm !== signupPassword && <p style={hintStyle('#ef4444')}>✗ Passwords do not match</p>}
              {signupConfirm && signupConfirm === signupPassword && <p style={hintStyle('#c8f04a')}>✓ Passwords match</p>}
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={lblStyle(t)}>Username or Email</label>
              <input type="text" placeholder="subho_123 or you@email.com" value={loginId}
                onChange={e => setLoginId(e.target.value)}
                style={inputBase(t)}
                onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ ...lblStyle(t), margin: 0 }}>Password</label>
                <span onClick={() => navigate('/forgot-password')} style={{ fontSize: '0.72rem', color: t.textMuted, cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showLoginPw ? 'text' : 'password'} placeholder="••••••••" value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ ...inputBase(t), paddingRight: '3rem' }}
                  onFocus={e => { e.target.style.borderColor = t.accentBorder; e.target.style.background = t.cardHover }}
                  onBlur={e => { e.target.style.borderColor = t.border; e.target.style.background = t.inputBg }}
                />
                <button onClick={() => setShowLoginPw(p => !p)} style={eyeBtn}>{showLoginPw ? '🙈' : '👁'}</button>
              </div>
            </div>
          </div>
        )}

        {error && <ErrorBox msg={error} t={t} />}

        <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={loading}
          style={{ ...btnPrimary(t), opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1.25rem' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = t.accentHover; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = t.accent; e.currentTarget.style.transform = 'translateY(0)' } }}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', border: `2px solid ${t.accentText}40`, borderTopColor: t.accentText, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Please wait...
              </span>
            : mode === 'login' ? 'Log In →' : 'Create Account →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', margin: 0 }}>
          <span onClick={() => navigate('/')} style={{ color: t.textMuted, cursor: 'pointer', textDecoration: 'underline' }}>← Back to home</span>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function LogoMark({ t, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '32px', height: '32px', marginBottom: '0.6rem' }}>
        {[...Array(9)].map((_, i) => <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? t.accent : t.border }} />)}
      </div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: t.text, letterSpacing: '-0.02em', margin: '0 0 0.2rem' }}>TTTAI</h1>
      {subtitle && <p style={{ color: t.textMuted, fontSize: '0.78rem', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

function ErrorBox({ msg, t }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0 }}>⚠</span><span>{msg}</span>
    </div>
  )
}

const inputBase = (t) => ({
  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
  border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
  fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif',
  outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
})

const btnPrimary = (t) => ({
  width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none',
  background: t.accent, color: t.accentText, fontSize: '0.95rem',
  fontWeight: 700, fontFamily: 'Syne, sans-serif',
  transition: 'all 0.2s', letterSpacing: '-0.01em',
  boxShadow: `0 8px 24px ${t.accentBg}`,
})

const lblStyle = (t) => ({
  display: 'block', fontSize: '0.76rem', color: t.textMuted,
  marginBottom: '0.35rem', fontWeight: 500, letterSpacing: '0.02em',
})

const hintStyle = (color) => ({
  fontSize: '0.7rem', color, margin: '4px 0 0',
})

const eyeBtn = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
  fontSize: '0.8rem', padding: '4px',
}