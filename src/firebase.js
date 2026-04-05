import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDxvFdi65WiIceryt9-oaQ3r5opCpD_22s",
  authDomain: "tictactoe-ai-1204d.firebaseapp.com",
  databaseURL: "https://tictactoe-ai-1204d-default-rtdb.firebaseio.com",
  projectId: "tictactoe-ai-1204d",
  storageBucket: "tictactoe-ai-1204d.firebasestorage.app",
  messagingSenderId: "782921254555",
  appId: "1:782921254555:web:c8b0cf71c4120b3ff7e83e",
  measurementId: "G-H8R7YCQQE0"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const googleProvider = new GoogleAuthProvider()