import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db, googleProvider } from '../firebase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ── Validators ──
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase())
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
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email or username.'
    case 'auth/wrong-password': return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential': return 'Invalid email/username or password.'
    case 'auth/invalid-login-credentials': return 'Invalid email/username or password.'
    case 'auth/email-already-in-use': return 'This email is already registered.'
    case 'auth/invalid-email': return 'Please enter a valid email address.'
    case 'auth/weak-password': return 'Password is too weak.'
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.'
    case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.'
    case 'auth/cancelled-popup-request': return 'Google sign-in was cancelled.'
    case 'auth/popup-blocked': return 'Popup blocked. Please allow popups for this site.'
    case 'auth/account-exists-with-different-credential': return 'An account already exists with this email using a different sign-in method.'
    default: return 'Something went wrong. Please try again.'
  }
}

const generateUsernameSuggestions = (base) => {
  const clean = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15)
  if (!clean) return []
  return [
    `${clean}_${Math.floor(Math.random() * 900 + 100)}`,
    `${clean}${Math.floor(Math.random() * 90 + 10)}`,
    `the_${clean}`,
  ]
}

const strengthColors = ['transparent', '#ef4444', '#f97316', '#eab308', '#84cc16', '#c8f04a']
const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong']

// ── Google username setup (new Google users only) ──
function GoogleUsernameSetup({ firebaseUser, onDone }) {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  const checkAvailability = useCallback(async (val) => {
    if (!val || val.length < 3 || !isValidUsername(val)) {
      setStatus(val.length > 0 ? 'invalid' : 'idle')
      setSuggestions([])
      return
    }
    setStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const snap = await get(ref(db, `usernames/${val.toLowerCase()}`))
        if (snap.exists()) {
          setStatus('taken')
          const raw = generateUsernameSuggestions(val)
          const checked = await Promise.all(
            raw.map(async (s) => {
              const sSnap = await get(ref(db, `usernames/${s.toLowerCase()}`))
              return { name: s, available: !sSnap.exists() }
            })
          )
          setSuggestions(checked.filter(s => s.available).map(s => s.name))
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
    if (!isValidUsername(username)) return setError('Username: 3-20 chars, letters/numbers/underscores only.')
    if (status === 'taken') return setError('Username already taken.')
    if (status === 'checking') return setError('Still checking username...')
    if (status === 'invalid') return setError('Invalid username format.')

    setLoading(true)
    try {
      // Final availability check
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
      toast.success('Welcome to TTTAI!')
      onDone()
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const borderColor = status === 'available' ? 'rgba(200,240,74,0.5)' : status === 'taken' || status === 'invalid' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <LogoMark />
        <p style={{ color: '#c8f04a', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'center' }}>One last step</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.35rem', textAlign: 'center' }}>
          Choose a Username
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', textAlign: 'center', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
          This is your public display name. It must be unique.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="subho_123"
              value={username}
              autoFocus
              maxLength={20}
              onChange={e => {
                const val = e.target.value.replace(/\s/g, '')
                setUsername(val)
                checkAvailability(val)
              }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ ...inputStyle, paddingRight: '2.5rem', borderColor }}
              onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.06)' }}
              onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.03)' }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>
              {status === 'checking' && <span style={{ color: 'rgba(255,255,255,0.3)' }}>⟳</span>}
              {status === 'available' && <span style={{ color: '#c8f04a' }}>✓</span>}
              {(status === 'taken' || status === 'invalid') && <span style={{ color: '#ef4444' }}>✗</span>}
            </span>
          </div>

          {status === 'available' && <p style={{ fontSize: '0.7rem', color: '#c8f04a', margin: '4px 0 0' }}>✓ Available</p>}
          {status === 'taken' && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>✗ Already taken</p>}
          {status === 'invalid' && username.length > 0 && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>Letters, numbers, and underscores only (3-20 chars)</p>}

          {status === 'taken' && suggestions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 5px' }}>Available suggestions:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setUsername(s); setStatus('available'); setSuggestions([]) }}
                    style={{ background: 'rgba(200,240,74,0.08)', border: '1px solid rgba(200,240,74,0.2)', color: '#c8f04a', padding: '0.28rem 0.7rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,240,74,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,240,74,0.08)'}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          3-20 characters · letters, numbers, and underscores only · no spaces
        </p>

        <button onClick={handleSave} disabled={loading || status === 'taken' || status === 'invalid' || status === 'checking'}
          style={{ ...submitStyle, background: loading || status === 'taken' || status === 'checking' ? 'rgba(200,240,74,0.4)' : '#c8f04a', cursor: loading || status === 'taken' || status === 'checking' ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ── Main Auth Component ──
export default function Auth() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [mode, setMode] = useState('login')
  const [googleUser, setGoogleUser] = useState(null)

  // Signup fields
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [signupUsernameStatus, setSignupUsernameStatus] = useState('idle')
  const [signupSuggestions, setSignupSuggestions] = useState([])
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirm, setShowSignupConfirm] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)

  // Login fields
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const usernameDebounce = useRef(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/select')
  }, [user])

  // Reset all fields on mode switch
  useEffect(() => {
    setError('')
    setSuccessMsg('')
    setSignupUsername('')
    setSignupEmail('')
    setSignupPassword('')
    setSignupConfirm('')
    setSignupUsernameStatus('idle')
    setSignupSuggestions([])
    setLoginId('')
    setLoginPassword('')
    setPwStrength(0)
    setShowSignupPassword(false)
    setShowSignupConfirm(false)
    setShowLoginPassword(false)
  }, [mode])

  const checkUsernameAvailability = useCallback(async (val) => {
    if (!val || val.length < 3 || !isValidUsername(val)) {
      setSignupUsernameStatus(val.length > 0 ? 'invalid' : 'idle')
      setSignupSuggestions([])
      return
    }
    setSignupUsernameStatus('checking')
    clearTimeout(usernameDebounce.current)
    usernameDebounce.current = setTimeout(async () => {
      try {
        const snap = await get(ref(db, `usernames/${val.toLowerCase()}`))
        if (snap.exists()) {
          setSignupUsernameStatus('taken')
          const raw = generateUsernameSuggestions(val)
          const checked = await Promise.all(
            raw.map(async (s) => {
              const sSnap = await get(ref(db, `usernames/${s.toLowerCase()}`))
              return { name: s, available: !sSnap.exists() }
            })
          )
          setSignupSuggestions(checked.filter(s => s.available).map(s => s.name))
        } else {
          setSignupUsernameStatus('available')
          setSignupSuggestions([])
        }
      } catch {
        setSignupUsernameStatus('idle')
      }
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
    } catch {
      return null
    }
  }

  const handleSignup = async () => {
    setError('')

    // Validate all fields
    if (!signupUsername.trim()) return setError('Please enter a username.')
    if (!isValidUsername(signupUsername)) return setError('Username: 3-20 chars, letters/numbers/underscores only.')
    if (signupUsernameStatus === 'checking') return setError('Still checking username availability.')
    if (signupUsernameStatus === 'taken') return setError('Username already taken. Please choose another.')
    if (signupUsernameStatus === 'invalid') return setError('Invalid username format.')
    if (!signupEmail.trim()) return setError('Please enter your email address.')
    if (!isValidEmail(signupEmail)) return setError('Please enter a valid email address (e.g. you@example.com).')
    if (!signupPassword) return setError('Please enter a password.')
    const pwErr = validatePassword(signupPassword)
    if (pwErr) return setError(pwErr)
    if (!signupConfirm) return setError('Please confirm your password.')
    if (signupPassword !== signupConfirm) return setError('Passwords do not match.')

    setLoading(true)
    try {
      // Final username check
      const usernameSnap = await get(ref(db, `usernames/${signupUsername.toLowerCase()}`))
      if (usernameSnap.exists()) {
        setLoading(false)
        setSignupUsernameStatus('taken')
        return setError('Username was just taken. Please choose another.')
      }

      // Create account
      const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword)

      // Update profile
      await updateProfile(cred.user, { displayName: signupUsername })

      // Save to database
      await set(ref(db, `users/${cred.user.uid}`), {
        username: signupUsername,
        email: signupEmail.trim().toLowerCase(),
        avatar: '',
        createdAt: Date.now(),
        scores: { wins: 0, losses: 0, draws: 0 },
        elo: 1000,
      })
      await set(ref(db, `usernames/${signupUsername.toLowerCase()}`), cred.user.uid)

      // Send email verification
      try {
        await sendEmailVerification(cred.user)
      } catch {
        // Non-critical — continue even if verification email fails
      }

      // Sign out immediately — force them to log in
      await signOut(auth)

      setMode('login')
      setSuccessMsg(`Account created! Welcome, ${signupUsername}. You can now log in.`)
      toast.success('Account created successfully!')
    } catch (err) {
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError('')

    if (!loginId.trim()) return setError('Please enter your username or email.')
    if (!loginPassword) return setError('Please enter your password.')

    setLoading(true)
    try {
      let emailToUse = loginId.trim()

      // If not an email, look up email from username
      if (!loginId.includes('@')) {
        if (!isValidUsername(loginId.trim())) {
          setLoading(false)
          return setError('Invalid username format. Use letters, numbers, and underscores only.')
        }
        const foundEmail = await getEmailFromUsername(loginId.trim())
        if (!foundEmail) {
          setLoading(false)
          return setError('No account found with this username.')
        }
        emailToUse = foundEmail
      }

      await signInWithEmailAndPassword(auth, emailToUse, loginPassword)
      toast.success('Welcome back!')
      navigate('/select')
    } catch (err) {
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const userSnap = await get(ref(db, `users/${cred.user.uid}`))

      if (userSnap.exists()) {
        // Existing user — go straight to game
        toast.success('Welcome back!')
        navigate('/select')
      } else {
        // New Google user — needs to pick username
        setGoogleUser(cred.user)
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(friendlyError(err.code))
      }
    }
    setGoogleLoading(false)
  }

  const handleGoogleDone = () => {
    navigate('/select')
  }

  // Show Google username setup if needed
  if (googleUser) {
    return <GoogleUsernameSetup firebaseUser={googleUser} onDone={handleGoogleDone} />
  }

  const usernameBorderColor = () => {
    if (signupUsernameStatus === 'available') return 'rgba(200,240,74,0.5)'
    if (signupUsernameStatus === 'taken' || signupUsernameStatus === 'invalid') return 'rgba(239,68,68,0.4)'
    return 'rgba(255,255,255,0.08)'
  }

  const confirmBorderColor = () => {
    if (!signupConfirm) return 'rgba(255,255,255,0.08)'
    if (signupConfirm === signupPassword) return 'rgba(200,240,74,0.4)'
    return 'rgba(239,68,68,0.4)'
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <LogoMark subtitle={mode === 'login' ? 'Welcome back, challenger' : 'Join the arena'} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s ease', background: mode === m ? '#c8f04a' : 'transparent', color: mode === m ? '#060912' : 'rgba(255,255,255,0.4)' }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ background: 'rgba(200,240,74,0.08)', border: '1px solid rgba(200,240,74,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#c8f04a', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}

        {/* Google button */}
        <button onClick={handleGoogle} disabled={loading || googleLoading} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', cursor: loading || googleLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.25rem', transition: 'all 0.2s', opacity: loading || googleLoading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading && !googleLoading) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* ── SIGNUP FORM ── */}
        {mode === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>

            {/* Username */}
            <div>
              <label style={labelStyle}>
                Username
                <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, marginLeft: '6px', fontSize: '0.68rem' }}>unique · 3-20 chars</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="subho_123" value={signupUsername} maxLength={20}
                  onChange={e => { const v = e.target.value.replace(/\s/g, ''); setSignupUsername(v); checkUsernameAvailability(v) }}
                  style={{ ...inputStyle, paddingRight: '2.5rem', borderColor: usernameBorderColor() }}
                  onFocus={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onBlur={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem' }}>
                  {signupUsernameStatus === 'checking' && <span style={{ color: 'rgba(255,255,255,0.3)' }}>⟳</span>}
                  {signupUsernameStatus === 'available' && <span style={{ color: '#c8f04a' }}>✓</span>}
                  {(signupUsernameStatus === 'taken' || signupUsernameStatus === 'invalid') && <span style={{ color: '#ef4444' }}>✗</span>}
                </span>
              </div>
              {signupUsernameStatus === 'available' && <p style={{ fontSize: '0.7rem', color: '#c8f04a', margin: '4px 0 0' }}>✓ Available</p>}
              {signupUsernameStatus === 'taken' && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>✗ Already taken</p>}
              {signupUsernameStatus === 'invalid' && signupUsername.length > 0 && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>Letters, numbers, underscores only (3-20 chars)</p>}

              {signupUsernameStatus === 'taken' && signupSuggestions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 5px' }}>Available suggestions:</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {signupSuggestions.map(s => (
                      <button key={s} onClick={() => { setSignupUsername(s); setSignupUsernameStatus('available'); setSignupSuggestions([]) }}
                        style={{ background: 'rgba(200,240,74,0.08)', border: '1px solid rgba(200,240,74,0.2)', color: '#c8f04a', padding: '0.28rem 0.7rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,240,74,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,240,74,0.08)'}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="you@example.com" value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: signupEmail && !isValidEmail(signupEmail) ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(200,240,74,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e => { e.target.style.borderColor = signupEmail && !isValidEmail(signupEmail) ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
              />
              {signupEmail && !isValidEmail(signupEmail) && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>Please enter a valid email address</p>}
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showSignupPassword ? 'text' : 'password'} placeholder="••••••••" value={signupPassword}
                  onChange={e => { setSignupPassword(e.target.value); setPwStrength(getPasswordStrength(e.target.value)) }}
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,240,74,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
                />
                <button onClick={() => setShowSignupPassword(p => !p)} style={eyeBtnStyle}>{showSignupPassword ? '🙈' : '👁'}</button>
              </div>
              {signupPassword.length > 0 && (
                <div style={{ marginTop: '7px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= pwStrength ? strengthColors[pwStrength] : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.68rem', margin: 0, color: pwStrength >= 4 ? '#c8f04a' : pwStrength >= 3 ? '#eab308' : '#ef4444', transition: 'color 0.3s' }}>
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
              {signupPassword.length === 0 && (
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
                  8+ chars · uppercase · lowercase · number · special char (@$!%*?&_#^)
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignupConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={signupConfirm}
                  onChange={e => setSignupConfirm(e.target.value)}
                  onPaste={e => e.preventDefault()}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  style={{ ...inputStyle, paddingRight: '3rem', borderColor: confirmBorderColor() }}
                  onFocus={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onBlur={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                />
                <button onClick={() => setShowSignupConfirm(p => !p)} style={eyeBtnStyle}>{showSignupConfirm ? '🙈' : '👁'}</button>
              </div>
              {signupConfirm && signupConfirm !== signupPassword && <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>✗ Passwords do not match</p>}
              {signupConfirm && signupConfirm === signupPassword && <p style={{ fontSize: '0.7rem', color: '#c8f04a', margin: '4px 0 0' }}>✓ Passwords match</p>}
            </div>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Username or Email</label>
              <input type="text" placeholder="subho_123 or you@email.com" value={loginId}
                onChange={e => setLoginId(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'rgba(200,240,74,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Password</label>
                <span onClick={() => navigate('/forgot-password')} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,240,74,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)' }}
                />
                <button onClick={() => setShowLoginPassword(p => !p)} style={eyeBtnStyle}>{showLoginPassword ? '🙈' : '👁'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <ErrorBox msg={error} />}

        {/* Submit */}
        <button
          onClick={mode === 'login' ? handleLogin : handleSignup}
          disabled={loading}
          style={{ ...submitStyle, background: loading ? 'rgba(200,240,74,0.5)' : '#c8f04a', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1.25rem' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#d4f55e'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(200,240,74,0.25)' } }}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#c8f04a'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,240,74,0.15)' } }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In →' : 'Create Account →'}
        </button>

        {/* Back to home */}
        <p style={{ textAlign: 'center', fontSize: '0.78rem', margin: 0 }}>
          <span onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>
            ← Back to home
          </span>
        </p>
      </div>
    </div>
  )
}

// ── Shared components ──
function LogoMark({ subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', width: '32px', height: '32px', marginBottom: '0.6rem' }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} style={{ borderRadius: '2px', background: i === 0 || i === 4 || i === 8 ? '#c8f04a' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'white', letterSpacing: '-0.02em', margin: '0 0 0.2rem' }}>TTTAI</h1>
      {subtitle && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠</span>
      <span>{msg}</span>
    </div>
  )
}

// ── Shared styles ──
const overlayStyle = {
  background: '#060912', minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem', fontFamily: 'DM Sans, sans-serif',
}

const cardStyle = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '28px', padding: '2.5rem 2.25rem',
  width: '100%', maxWidth: '420px',
  boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
  position: 'relative',
}

const labelStyle = {
  display: 'block', fontSize: '0.76rem',
  color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem',
  fontWeight: 500, letterSpacing: '0.02em',
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem',
  borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)', color: 'white',
  fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif',
  outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
}

const eyeBtnStyle = {
  position: 'absolute', right: '12px', top: '50%',
  transform: 'translateY(-50%)', background: 'none',
  border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '4px',
}

const submitStyle = {
  width: '100%', padding: '0.9rem', borderRadius: '12px',
  border: 'none', color: '#060912', fontSize: '0.95rem',
  fontWeight: 700, fontFamily: 'Syne, sans-serif',
  transition: 'all 0.2s', letterSpacing: '-0.01em',
  boxShadow: '0 8px 24px rgba(200,240,74,0.15)',
}