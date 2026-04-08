import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db, googleProvider } from '../firebase'
import { useAuth } from '../context/AuthContext'

// ── Validators ──
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u)

const validatePassword = (p) => {
  if (p.length < 8) return 'At least 8 characters required.'
  if (!/[A-Z]/.test(p)) return 'Must include an uppercase letter.'
  if (!/[a-z]/.test(p)) return 'Must include a lowercase letter.'
  if (!/\d/.test(p)) return 'Must include a number.'
  if (!/[@$!%*?&_#^]/.test(p)) return 'Must include a special character (@$!%*?&_#^).'
  return null
}

const passwordStrength = (p) => {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[@$!%*?&_#^]/.test(p)) s++
  return s
}

const strengthColor = ['transparent','#ef4444','#f97316','#eab308','#84cc16','#c8f04a']
const strengthLabel = ['','Very Weak','Weak','Fair','Good','Strong']

// ── Username suggestions ──
const generateSuggestions = (base) => {
  const clean = base.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  if (!clean) return []
  return [
    `${clean}_${Math.floor(Math.random() * 900 + 100)}`,
    `${clean}_x${Math.floor(Math.random() * 90 + 10)}`,
    `the_${clean}`,
  ]
}

// ── DB helpers ──
const isUsernameAvailable = async (u) => {
  try {
    const snap = await get(ref(db, `usernames/${u.toLowerCase()}`))
    return !snap.exists()
  } catch { return true }
}

const getEmailFromUsername = async (u) => {
  try {
    const snap = await get(ref(db, `usernames/${u.toLowerCase()}`))
    if (!snap.exists()) return null
    const uid = snap.val()
    const userSnap = await get(ref(db, `users/${uid}`))
    if (!userSnap.exists()) return null
    return userSnap.val().email
  } catch { return null }
}

const saveUserToDb = async (user, uname) => {
  await set(ref(db, `users/${user.uid}`), {
    username: uname,
    email: user.email || '',
    createdAt: Date.now(),
    scores: { wins: 0, losses: 0, draws: 0 },
  })
  await set(ref(db, `usernames/${uname.toLowerCase()}`), user.uid)
}

const friendlyError = (code) => {
  switch (code) {
    case 'auth/user-not-found': return 'No account found.'
    case 'auth/wrong-password': return 'Incorrect password.'
    case 'auth/invalid-credential': return 'Invalid username/email or password.'
    case 'auth/email-already-in-use': return 'Email already registered.'
    case 'auth/invalid-email': return 'Invalid email address.'
    case 'auth/weak-password': return 'Password too weak.'
    case 'auth/popup-closed-by-user': return 'Google sign-in cancelled.'
    case 'auth/cancelled-popup-request': return 'Google sign-in cancelled.'
    case 'auth/popup-blocked': return 'Popup blocked. Allow popups for this site.'
    default: return 'Something went wrong. Please try again.'
  }
}

// ── Google extra info screen ──
function GoogleUsernameSetup({ user, onDone }) {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | available | taken
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const checkUsername = (val) => {
    if (!val || val.length < 3) {
      setStatus('idle')
      setSuggestions([])
      return
    }
    if (!isValidUsername(val)) {
      setStatus('idle')
      setSuggestions([])
      return
    }
    setStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(val)
      if (avail) {
        setStatus('available')
        setSuggestions([])
      } else {
        setStatus('taken')
        const s = generateSuggestions(val)
        const checked = await Promise.all(s.map(async sg => ({
          name: sg,
          avail: await isUsernameAvailable(sg),
        })))
        setSuggestions(checked.filter(x => x.avail).map(x => x.name))
      }
    }, 600)
  }

  const handleSave = async () => {
    setError('')
    if (!username) return setError('Please enter a username.')
    if (!isValidUsername(username)) return setError('Invalid username format.')
    if (status === 'taken') return setError('Username already taken.')
    if (status === 'checking') return setError('Still checking username...')
    setLoading(true)
    try {
      await updateProfile(user, { displayName: username })
      await saveUserToDb(user, username)
      onDone()
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={screenWrap}>
      <div style={cardStyle}>
        <LogoMark />
        <h2 style={headStyle}>One last step</h2>
        <p style={subHeadStyle}>Pick a username for your TTTAI profile</p>

        <div style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Username</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="subho_123"
              value={username}
              onChange={e => {
                const val = e.target.value.replace(/\s/g, '')
                setUsername(val)
                checkUsername(val)
              }}
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                e.target.style.background = 'rgba(255,255,255,0.06)'
              }}
              onBlur={e => {
                e.target.style.borderColor = status === 'available'
                  ? 'rgba(200,240,74,0.4)'
                  : status === 'taken'
                  ? 'rgba(239,68,68,0.4)'
                  : 'rgba(255,255,255,0.08)'
                e.target.style.background = 'rgba(255,255,255,0.03)'
              }}
            />
            {/* Status indicator */}
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              {status === 'checking' && <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>}
              {status === 'available' && <span style={{ color: '#c8f04a' }}>✓</span>}
              {status === 'taken' && <span style={{ color: '#ef4444' }}>✗</span>}
            </div>
          </div>

          {/* Status text */}
          {status === 'available' && (
            <p style={{ fontSize: '0.72rem', color: '#c8f04a', margin: '4px 0 0' }}>
              ✓ Username available
            </p>
          )}
          {status === 'taken' && (
            <p style={{ fontSize: '0.72rem', color: '#ef4444', margin: '4px 0 0' }}>
              ✗ Username already taken
            </p>
          )}

          {/* Suggestions */}
          {status === 'taken' && suggestions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' }}>
                Try one of these:
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setUsername(s)
                      setStatus('available')
                      setSuggestions([])
                    }}
                    style={{
                      background: 'rgba(200,240,74,0.08)',
                      border: '1px solid rgba(200,240,74,0.2)',
                      color: '#c8f04a',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,240,74,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,240,74,0.08)'}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        <button
          onClick={handleSave}
          disabled={loading || status === 'checking' || status === 'taken'}
          style={{
            ...submitStyle,
            background: loading || status === 'taken' || status === 'checking'
              ? 'rgba(200,240,74,0.4)'
              : '#c8f04a',
            cursor: loading || status === 'taken' || status === 'checking'
              ? 'not-allowed'
              : 'pointer',
          }}
          onMouseEnter={e => {
            if (!loading && status !== 'taken' && status !== 'checking') {
              e.currentTarget.style.background = '#d4f55e'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#c8f04a'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
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
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Login fields
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)

  const debounceRef = useRef(null)

  useEffect(() => {
    if (user) navigate('/game')
  }, [user])

  useEffect(() => {
    setError('')
    setSuccess('')
    setUsername('')
    setUsernameStatus('idle')
    setSuggestions([])
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setLoginId('')
    setLoginPassword('')
    setPwStrength(0)
    setShowPassword(false)
    setShowConfirm(false)
  }, [mode])

  // Real-time username check
  const handleUsernameChange = (val) => {
    const cleaned = val.replace(/\s/g, '')
    setUsername(cleaned)
    setSuggestions([])

    if (!cleaned || cleaned.length < 3) {
      setUsernameStatus('idle')
      return
    }

    if (!isValidUsername(cleaned)) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(cleaned)
      if (avail) {
        setUsernameStatus('available')
        setSuggestions([])
      } else {
        setUsernameStatus('taken')
        const raw = generateSuggestions(cleaned)
        const checked = await Promise.all(raw.map(async s => ({
          name: s,
          avail: await isUsernameAvailable(s),
        })))
        setSuggestions(checked.filter(x => x.avail).map(x => x.name))
      }
    }, 600)
  }

  // Signup
  const handleSignup = async () => {
    setError('')
    if (!username) return setError('Please enter a username.')
    if (usernameStatus === 'checking') return setError('Still checking username availability.')
    if (usernameStatus === 'taken') return setError('Username is taken. Please choose another.')
    if (!isValidUsername(username)) return setError('Invalid username.')
    if (!email) return setError('Please enter your email.')
    if (!isValidEmail(email)) return setError('Please enter a valid email address.')
    if (!password) return setError('Please enter a password.')
    const pwErr = validatePassword(password)
    if (pwErr) return setError(pwErr)
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    try {
      const avail = await isUsernameAvailable(username)
      if (!avail) {
        setLoading(false)
        return setError('Username was just taken. Please choose another.')
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: username })
      await saveUserToDb(cred.user, username)
      await auth.signOut()
      setMode('login')
      setSuccess('Account created! Please log in with your credentials.')
    } catch (err) {
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  // Login
  const handleLogin = async () => {
    setError('')
    if (!loginId) return setError('Please enter your username or email.')
    if (!loginPassword) return setError('Please enter your password.')

    setLoading(true)
    try {
      let emailToUse = loginId.trim()
      if (!emailToUse.includes('@')) {
        const found = await getEmailFromUsername(emailToUse)
        if (!found) {
          setLoading(false)
          return setError('No account found with this username.')
        }
        emailToUse = found
      }
      await signInWithEmailAndPassword(auth, emailToUse, loginPassword)
      navigate('/game')
    } catch (err) {
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  // Google
  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const snap = await get(ref(db, `users/${cred.user.uid}`))
      if (snap.exists()) {
        navigate('/game')
      } else {
        setGoogleUser(cred.user)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    }
    setLoading(false)
  }

  // Google username setup done
  const handleGoogleDone = () => {
    navigate('/game')
  }

  // Show Google username setup
  if (googleUser) {
    return <GoogleUsernameSetup user={googleUser} onDone={handleGoogleDone} />
  }

  return (
    <div style={screenWrap}>
      <div style={cardStyle}>
        <LogoMark />

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '1.5rem',
        }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.25s',
              background: mode === m ? '#c8f04a' : 'transparent',
              color: mode === m ? '#060912' : 'rgba(255,255,255,0.4)',
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Success */}
        {success && (
          <div style={{
            background: 'rgba(200,240,74,0.08)',
            border: '1px solid rgba(200,240,74,0.2)',
            borderRadius: '10px',
            padding: '0.7rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            color: '#c8f04a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ✓ {success}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'white',
            fontSize: '0.88rem',
            fontFamily: 'DM Sans, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '1.25rem',
            transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
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
                <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, marginLeft: '6px', fontSize: '0.68rem' }}>
                  3-20 chars · letters, numbers, _
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="subho_123"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingRight: '2.5rem',
                    borderColor: usernameStatus === 'available'
                      ? 'rgba(200,240,74,0.4)'
                      : usernameStatus === 'taken'
                      ? 'rgba(239,68,68,0.4)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onBlur={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                />
                <span style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {usernameStatus === 'checking' && <span style={{ color: 'rgba(255,255,255,0.3)' }}>⟳</span>}
                  {usernameStatus === 'available' && <span style={{ color: '#c8f04a' }}>✓</span>}
                  {usernameStatus === 'taken' && <span style={{ color: '#ef4444' }}>✗</span>}
                </span>
              </div>

              {usernameStatus === 'available' && (
                <p style={{ fontSize: '0.7rem', color: '#c8f04a', margin: '4px 0 0' }}>✓ Available</p>
              )}
              {usernameStatus === 'taken' && (
                <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>✗ Already taken</p>
              )}

              {/* Suggestions */}
              {usernameStatus === 'taken' && suggestions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 5px' }}>
                    Available suggestions:
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setUsername(s)
                          setUsernameStatus('available')
                          setSuggestions([])
                        }}
                        style={{
                          background: 'rgba(200,240,74,0.08)',
                          border: '1px solid rgba(200,240,74,0.2)',
                          color: '#c8f04a',
                          padding: '0.28rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,240,74,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,240,74,0.08)'}
                      >
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
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                  e.target.style.background = 'rgba(255,255,255,0.06)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.background = 'rgba(255,255,255,0.03)'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setPwStrength(passwordStrength(e.target.value))
                  }}
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                    e.target.style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.background = 'rgba(255,255,255,0.03)'
                  }}
                />
                <button onClick={() => setShowPassword(p => !p)} style={eyeBtn}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              {password.length > 0 && (
                <div style={{ marginTop: '7px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: i <= pwStrength ? strengthColor[pwStrength] : 'rgba(255,255,255,0.08)',
                        transition: 'all 0.3s',
                      }} />
                    ))}
                  </div>
                  <p style={{
                    fontSize: '0.68rem', margin: 0,
                    color: pwStrength >= 4 ? '#c8f04a' : pwStrength >= 3 ? '#eab308' : '#ef4444',
                    transition: 'color 0.3s',
                  }}>
                    {strengthLabel[pwStrength]}
                    {pwStrength < 5 && ' · missing: ' + [
                      !(/[A-Z]/.test(password)) && 'uppercase',
                      !(/[a-z]/.test(password)) && 'lowercase',
                      !(/\d/.test(password)) && 'number',
                      !(/[@$!%*?&_#^]/.test(password)) && 'special char',
                      password.length < 8 && '8+ chars',
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {password.length === 0 && (
                <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
                  8+ chars · uppercase · lowercase · number · special char (@$!%*?&_#^)
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  style={{
                    ...inputStyle,
                    paddingRight: '3rem',
                    borderColor: confirmPassword && confirmPassword !== password
                      ? 'rgba(239,68,68,0.4)'
                      : confirmPassword && confirmPassword === password
                      ? 'rgba(200,240,74,0.4)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onBlur={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                />
                <button onClick={() => setShowConfirm(p => !p)} style={eyeBtn}>
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: '4px 0 0' }}>
                  ✗ Passwords do not match
                </p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p style={{ fontSize: '0.7rem', color: '#c8f04a', margin: '4px 0 0' }}>
                  ✓ Passwords match
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Username or Email</label>
              <input
                type="text"
                placeholder="subho_123 or you@email.com"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                style={inputStyle}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                  e.target.style.background = 'rgba(255,255,255,0.06)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.background = 'rgba(255,255,255,0.03)'
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(200,240,74,0.4)'
                    e.target.style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.background = 'rgba(255,255,255,0.03)'
                  }}
                />
                <button onClick={() => setShowPassword(p => !p)} style={eyeBtn}>
                  {showPassword ? '🙈' : '👁'}
                </button>
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
          style={{
            ...submitStyle,
            background: loading ? 'rgba(200,240,74,0.5)' : '#c8f04a',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.background = '#d4f55e'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(200,240,74,0.25)'
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.background = '#c8f04a'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,240,74,0.15)'
            }
          }}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login' ? 'Log In →' : 'Create Account →'}
        </button>

        {mode === 'login' && (
  <p style={{ textAlign: 'center', margin: '0.75rem 0 0', fontSize: '0.78rem' }}>
    <span onClick={() => navigate('/forgot-password')} style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline' }}>
      Forgot password?
    </span>
  </p>
)}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', margin: '1.25rem 0 0' }}>
          <span
            onClick={() => navigate('/')}
            style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to home
          </span>
        </p>

      </div>
    </div>
  )
}

// ── Shared components ──
function LogoMark() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: '3px', width: '32px', height: '32px',
        marginBottom: '0.6rem',
      }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} style={{
            borderRadius: '2px',
            background: i === 0 || i === 4 || i === 8
              ? '#c8f04a' : 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </div>
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.3rem', color: 'white',
        letterSpacing: '-0.02em', margin: '0 0 0.2rem',
      }}>TTTAI</h1>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px',
      padding: '0.7rem 1rem',
      marginBottom: '1rem',
      fontSize: '0.8rem',
      color: '#f87171',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      lineHeight: 1.5,
    }}>
      <span>⚠</span><span>{msg}</span>
    </div>
  )
}

// ── Shared styles ──
const screenWrap = {
  background: '#060912',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  fontFamily: 'DM Sans, sans-serif',
}

const cardStyle = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '28px',
  padding: '2.5rem 2.25rem',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
  position: 'relative',
}

const headStyle = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: '1.4rem',
  color: 'white',
  letterSpacing: '-0.02em',
  margin: '0 0 0.35rem',
  textAlign: 'center',
}

const subHeadStyle = {
  color: 'rgba(255,255,255,0.35)',
  fontSize: '0.82rem',
  textAlign: 'center',
  margin: '0',
  lineHeight: 1.5,
}

const labelStyle = {
  display: 'block',
  fontSize: '0.76rem',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '0.35rem',
  fontWeight: 500,
  letterSpacing: '0.02em',
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: 'white',
  fontSize: '0.88rem',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box',
}

const eyeBtn = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.3)',
  fontSize: '0.8rem',
  padding: '4px',
}

const submitStyle = {
  width: '100%',
  padding: '0.9rem',
  borderRadius: '12px',
  border: 'none',
  color: '#060912',
  fontSize: '0.95rem',
  fontWeight: 700,
  fontFamily: 'Syne, sans-serif',
  transition: 'all 0.2s',
  letterSpacing: '-0.01em',
  boxShadow: '0 8px 24px rgba(200,240,74,0.15)',
}