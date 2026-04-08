import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ForgotPassword from './pages/ForgotPassword'
import ModeSelect from './pages/ModeSelect'
import Game from './game/Game'
import LocalMultiplayer from './game/LocalMultiplayer'
import OnlineMultiplayer from './pages/OnlineMultiplayer'
import OnlineGame from './pages/OnlineGame'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Friends from './pages/Friends'
import Tournament from './pages/Tournament'
import Leaderboard from './pages/Leaderboard'
import Visualizer from './pages/Visualizer'
import Replay from './pages/Replay'
import Spectate from './pages/Spectate'
import ProtectedRoute from './components/ProtectedRoute'
import PushNotificationManager from './components/PushNotificationManager'

function App() {
  return (
    <BrowserRouter>
      <PushNotificationManager />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/select" element={<ProtectedRoute><ModeSelect /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/multiplayer" element={<ProtectedRoute><LocalMultiplayer /></ProtectedRoute>} />
        <Route path="/online" element={<ProtectedRoute><OnlineMultiplayer /></ProtectedRoute>} />
        <Route path="/online/:roomId" element={<ProtectedRoute><OnlineGame /></ProtectedRoute>} />
        <Route path="/replay/:roomId" element={<ProtectedRoute><Replay /></ProtectedRoute>} />
        <Route path="/spectate/:roomId" element={<ProtectedRoute><Spectate /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
        <Route path="/tournament" element={<ProtectedRoute><Tournament /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/visualizer" element={<ProtectedRoute><Visualizer /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App