import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ModeSelect from './pages/ModeSelect'
import Game from './game/Game'
import LocalMultiplayer from './game/LocalMultiplayer'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import Leaderboard from './pages/Leaderboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/select" element={
          <ProtectedRoute>
            <ModeSelect />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
  <ProtectedRoute>
    <Leaderboard />
  </ProtectedRoute>
} />
        <Route path="/game" element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        } />
        <Route path="/multiplayer" element={
          <ProtectedRoute>
            <LocalMultiplayer />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App