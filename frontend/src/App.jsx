import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'

import AuthPanel from './components/AuthPanel'
import { authApi } from './services/api'

import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if the user have already been authenticated per refresh
  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        setUser(data.user)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setCheckingSession(false)
      })
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SafeRoute</p>
          <h1>Community safety dashboard</h1>
        </div>

        <span className="session-status">
          {checkingSession ? 'Checking session…' : user ? `Hello, ${user.name}` : 'Guest'}
        </span>
      </header>

      <div className="page-grid">
        <AuthPanel
          user={user}
          onUserChange={setUser}
        />
      </div>
    </main>
  )
}

export default App
