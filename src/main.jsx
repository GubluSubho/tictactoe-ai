import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0d1220',
              color: '#f0f4ff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#c8f04a', secondary: '#060912' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#060912' },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)