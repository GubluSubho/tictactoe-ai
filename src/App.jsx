import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ModeSelect from './pages/ModeSelect'
import Game from './game/Game'
import LocalMultiplayer from './game/LocalMultiplayer'
import OnlineMultiplayer from './pages/OnlineMultiplayer'
import OnlineGame from './pages/OnlineGame'
import Profile from './pages/Profile'
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
        <Route path="/select" element={<ProtectedRoute><ModeSelect /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/multiplayer" element={<ProtectedRoute><LocalMultiplayer /></ProtectedRoute>} />
        <Route path="/online" element={<ProtectedRoute><OnlineMultiplayer /></ProtectedRoute>} />
        <Route path="/online/:roomId" element={<ProtectedRoute><OnlineGame /></ProtectedRoute>} />
        <Route path="/replay/:roomId" element={<ProtectedRoute><Replay /></ProtectedRoute>} />
        <Route path="/spectate/:roomId" element={<ProtectedRoute><Spectate /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/visualizer" element={<ProtectedRoute><Visualizer /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App